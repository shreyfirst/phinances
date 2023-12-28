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

export async function GET(
    request: NextRequest
  ) {

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

      const link_request: LinkTokenCreateRequest = {
        user: {
          client_user_id: request.nextUrl.searchParams.get("user"),
        },
        client_name: "Phinances",
        products: [Products.Auth],
        // required_if_supported_products: [Products.Balance],
        country_codes: [CountryCode.Us],
        language: "en",
        webhook: "https://webhook.site/c11fcb13-a7e0-4975-8c6b-73b02c253527",
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