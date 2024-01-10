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
import { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(
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
      const href = (process.env.ENVIRONMENT == "sandbox" ? await request.headers.get('referer') : await request.headers.get('x-href'))
      const url = new URL(href);

      const supa = new SupabaseClient("https://zfdtxahxffjgbqqslppn.supabase.co",process.env.SUPABASE_MASTER)
      
      const cookieStore = cookies()
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
      const user = await supabase.auth.getUser()

      const bank_account = await supabase.from('bank_accounts').select().eq('id', request.nextUrl.searchParams.get("bank_account"))
      const bank_number = await supa.from('bank_numbers').select().eq('id', bank_account.data[0].numbers)
      
      const link_request: LinkTokenCreateRequest = {
        user: {
          client_user_id: user.data.user.id,
        },
        client_name: "Phinances",
        products: [],
        // required_if_supported_products: [Products.Balance],
        country_codes: [CountryCode.Us],
        access_token: bank_number.data[0].access_token,
        language: "en",
        webhook: url.origin + '/api/webhook/auth'
      };
      try {
        // console.log("in try");
        const response = await client.linkTokenCreate(link_request);
        const linkToken = response.data.link_token;
    
        return Response.json({ "link_token": linkToken })

      } catch (error) {
        // handle error
        console.log(error);
      }

    
}