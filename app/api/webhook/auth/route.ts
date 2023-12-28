import { URLSearchParams } from 'url';
import plaid, {
  Configuration,
  CountryCode,
  ItemPublicTokenExchangeRequest,
  LinkTokenCreateRequest,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from "plaid";
import { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest
) {

  const configuration = new Configuration({
    basePath: PlaidEnvironments[(process.env['ENVIRONMENT'] == 'production' ? 'production' : 'sandbox')],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SECRET,
      },
    },
  });

  const client = new PlaidApi(configuration);

  const { record } = await request.json()

  if (record.ready == "instant_pending") {
    const id = record.id;
    const access_token = record.access_token;
    const plaid_id = record.plaid_id;
    const user_id = record.user;
3
    const plaidAuth = (await client.authGet({
      access_token: access_token,
      options: {
        account_ids: [plaid_id]
      }
    })).data

    const achNumbers = plaidAuth.numbers.ach;

    let url = 'https://sandbox.increase.com/external_accounts';

    let options = {
      method: 'POST',
      headers: {
        accept: 'application/json, text/plain, */*',
        'content-type': 'application/json',
        Authorization: 'Bearer ' + process.env.PLAID_SANDBOX_SECRET
      },
      body: `{"account_number":"${achNumbers[0].account}","routing_number":"${achNumbers[0].routing}","description":"${id}"}`
    };

    const increase_id = await fetch(url, options)
      .then(res => res.json())
      .catch(err => console.error('error:' + err));

    try {

      const dbResponse = await fetch(`https://${process.env.SUPABASE_PROJECT}.supabase.co/rest/v1/bank_numbers`, {
        method: 'POST',
        headers: {
          "apikey": process.env.SUPABASE_MASTER,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          account_number: achNumbers[0].account,
          routing_number: achNumbers[0].routing,
          user_id: user_id,
          id: increase_id.id
        })
      })

      await fetch(`https://${process.env.SUPABASE_PROJECT}.supabase.co/rest/v1/bank_accounts?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          "apikey": process.env.SUPABASE_MASTER,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({ numbers: increase_id.id, ready: "ready" })
      })
      console.log(increase_id.id)

      return Response.json({})

    } catch (error) {
      // handle error
      console.log(error);
    }

  }

}