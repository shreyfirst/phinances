import { URLSearchParams } from 'url';
import plaid, {
  AccountsGetRequest,
  AccountsGetResponse,
  AuthGetResponse,
  Configuration,
  CountryCode,
  ItemPublicTokenExchangeRequest,
  LinkTokenCreateRequest,
  PlaidApi,
  PlaidEnvironments,
  PlaidError,
  Products,
} from "plaid";
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { AuthResponse } from '@supabase/supabase-js';

const parseAccountData = (inputJson: AccountsGetResponse, access_token: string) => {

  if (!inputJson || !inputJson.accounts || !inputJson.item) {
    return null;
  }

  const output = [];

  inputJson.accounts.forEach(account => {

    let status = "ready"
    if ("verification_status" in account) {
      status = "manual_pending"
    }
    let accountData = {
      numbers: null,
      description: account.name,
      mask: account.mask,
      institution: inputJson.item.institution_id,
      plaid_id: account.account_id,
      // access_token: access_token,
      ready: status
    };

    output.push(accountData);
  });
  return output;
};

export async function GET(
  request: NextRequest
) {

  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  const configuration = new Configuration({
    basePath: PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SANDBOX_SECRET,
      },
    },
  });

  const client = new PlaidApi(configuration);

  const public_token = await request.nextUrl.searchParams.get("public_token")
  const exchange_request: ItemPublicTokenExchangeRequest = {
    public_token
  };
  try {
    // console.log("in try");
    const response = await client.itemPublicTokenExchange(exchange_request);
    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    const account_request: AccountsGetRequest = {
      access_token: accessToken
    };

    const accounts = await client.accountsGet(account_request)
    const push = await parseAccountData(accounts.data, accessToken)

    const { data, error } = await supabase
      .from('bank_accounts')
      .upsert(push, {
        ignoreDuplicates: true
      })
      .select()

    for (const item of push) {
      if (item.ready == "ready") {
        const bank_nums = await client.authGet({
          access_token: accessToken
        })
        const { data, error } = await supabase
        .from('bank_numbers')
        .upsert(push, {
          ignoreDuplicates: true
        })
        .select()
      }
    }

    return Response.json(data)

  } catch (error) {
    // handle error
    console.log(error);
  }


}