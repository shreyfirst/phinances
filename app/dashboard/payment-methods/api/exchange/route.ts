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
  SandboxItemSetVerificationStatusRequestVerificationStatusEnum,
} from "plaid";
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { AuthResponse, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const parseAccountData = (inputJson: AccountsGetResponse, access_token: string) => {

  if (!inputJson || !inputJson.accounts || !inputJson.item) {
    return null;
  }

  const output = [];

  inputJson.accounts.forEach(account => {

    let status = "ready"
    if ("verification_status" in account) {
      status = account.verification_status
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
    basePath: PlaidEnvironments[(process.env['ENVIRONMENT'] == 'production' ? 'production' : 'sandbox')],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SECRET,
      },
    },
  });

  const client = new PlaidApi(configuration);
  const supa = new SupabaseClient("https://zfdtxahxffjgbqqslppn.supabase.co", process.env.SUPABASE_MASTER)

  const public_token = await request.nextUrl.searchParams.get("public_token")
  const exchange_request: ItemPublicTokenExchangeRequest = {
    public_token
  };
  try {
    const response = await client.itemPublicTokenExchange(exchange_request);
    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    const account_request: AccountsGetRequest = {
      access_token: accessToken
    };

    const accounts = await client.accountsGet(account_request)
    const push = await parseAccountData(accounts.data, accessToken)

    for (let item of push) {

      if (item.ready == "ready") { // instant

        const bank_nums = await client.authGet({
          access_token: accessToken
        })

        await supa
          .from('bank_numbers')
          .insert({
            "access_token": accessToken,
            "account_number": bank_nums.data.numbers.ach[0].account,
            "routing_number": bank_nums.data.numbers.ach[0].routing,
            "user": (await supabase.auth.getUser()).data.user.id
          }).select().then((res) => {
            item.numbers = res.data[0].id
          })

      } else if (item.ready == "manually_verified") {

        const bank_nums = await client.authGet({
          access_token: accessToken
        })
        await supa
          .from('bank_numbers')
          .update({
            "account_number": bank_nums.data.numbers.ach[0].account,
            "routing_number": bank_nums.data.numbers.ach[0].routing
          }).eq('access_token', accessToken).select().then((res) => {
            item.numbers = res.data[0].id
          })
        item.id = await supabase.from('bank_accounts').select().eq('numbers', item.numbers).then((res)=>{
          return res.data[0].id
        })
        item.ready = "ready"

      }

      else {

        await supa
          .from('bank_numbers')
          .insert({
            "access_token": accessToken,
            "user": (await supabase.auth.getUser()).data.user.id
          }).select().then((res) => {
            item.numbers = res.data[0].id
          })

        if (process.env["ENVIRONMENT"] == "sandbox" && item.ready == "pending_automatic_verification") {
          const webh = await client.sandboxItemSetVerificationStatus({
            access_token: accessToken,
            account_id: accounts.data.accounts[0].account_id,
            verification_status: SandboxItemSetVerificationStatusRequestVerificationStatusEnum.AutomaticallyVerified
          })
        }
      }

    }

    const { data, error } = await supabase
      .from('bank_accounts')
      .upsert(push)
      .select()

    return Response.json(data)

  } catch (error) {
    // handle error
    console.log(error);
  }


}