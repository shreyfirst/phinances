import { URLSearchParams } from 'url';
import plaid, {
  Configuration,
  CountryCode,
  ItemPublicTokenExchangeRequest,
  LinkTokenCreateRequest,
  PlaidApi,
  PlaidEnvironments,
  Products,
  SandboxIncomeWebhookFireRequestWebhookCode,
} from "plaid";
import { NextRequest } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';

export async function POST(
  request: NextRequest
) {

  console.log("auth webhook activated")

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
  const supa = new SupabaseClient("https://zfdtxahxffjgbqqslppn.supabase.co",process.env.SUPABASE_MASTER)

  const json = await request.json()

  const bank_account = await supa.from('bank_accounts').select().eq('plaid_id', json.account_id).then((res)=>res.data[0])
  const bank_number = await supa.from('bank_numbers').select().eq('id',bank_account.numbers).then((res)=>res.data[0])
  
  const plaid_auth = await client.authGet({
    access_token: bank_number.access_token
  }).then((res)=>res.data)

  if (plaid_auth.numbers.ach.length > 0) {
    const accounts_update = await supa.from('bank_accounts').update({
      "ready": "ready"
    }).eq('id', bank_account.id)
    const numbers_update = await supa.from('bank_numbers').update({
      "account_number": plaid_auth.numbers.ach[0].account,
      "routing_number": plaid_auth.numbers.ach[0].routing
    }).eq('id', bank_number.id)
  }

  return Response.json({})

}