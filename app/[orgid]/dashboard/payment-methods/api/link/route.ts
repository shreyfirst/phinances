import { URLSearchParams } from 'url';
import plaid, {
    Configuration,
    CountryCode,
    ItemPublicTokenExchangeRequest,
    LinkTokenCreateRequest,
    LinkTokenCreateRequestUpdate,
    PlaidApi,
    PlaidEnvironments,
    Products,
  } from "plaid";
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(
    request: NextRequest
  ) {

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const user = await supabase.auth.getUser()

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

      const link_request: LinkTokenCreateRequest = {
        user: {
          client_user_id: user.data.user.id,
        },
        client_name: "Phinances",
        products: [Products.Auth],
        // required_if_supported_products: [Products.Balance],
        country_codes: [CountryCode.Us],
        language: "en",
        webhook: url.origin + '/api/webhook/auth',
        auth: {
          // auth_type_select_enabled: true,
          automated_microdeposits_enabled: true,
          same_day_microdeposits_enabled: true,
          instant_microdeposits_enabled: true
        }
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