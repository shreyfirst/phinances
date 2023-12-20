// import { URLSearchParams } from 'url';
// import plaid, {
//   AccountsGetRequest,
//   AccountsGetResponse,
//   AuthGetResponse,
//   Configuration,
//   CountryCode,
//   ItemPublicTokenExchangeRequest,
//   LinkTokenCreateRequest,
//   PlaidApi,
//   PlaidEnvironments,
//   PlaidError,
//   Products,
// } from "plaid";
import { NextRequest } from 'next/server';
// import { cookies } from 'next/headers'
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
// import { AuthResponse } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest
) {

//   const cookieStore = cookies()
//   const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

//   const configuration = new Configuration({
//     basePath: PlaidEnvironments.sandbox,
//     baseOptions: {
//       headers: {
//         "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
//         "PLAID-SECRET": process.env.PLAID_SANDBOX_SECRET,
//       },
//     },
//   });

//   const client = new PlaidApi(configuration);

//   const public_token = await request.nextUrl.searchParams.get("public_token")
//   const exchange_request: ItemPublicTokenExchangeRequest = {
//     public_token
//   };
//   try {
//     // console.log("in try");
//     const response = await client.itemPublicTokenExchange(exchange_request);
//     const accessToken = response.data.access_token;
//     const itemId = response.data.item_id;

//     const accounts_balance = await client.accountsBalanceGet({
//       access_token: accessToken
//     })

//     console.log(accounts_balance)

//     const { data, error } = await supabase
//       .from('bank_accounts')
//       .upsert(push, {
//         ignoreDuplicates: true
//       })
//       .select()

//     return Response.json(data)

//   } catch (error) {
//     // handle error
//     console.log(error);
//   }


}