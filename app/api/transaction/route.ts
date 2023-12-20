import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import md5 from 'crypto-js/md5';

// export async function POST(request: NextRequest) {

//     const cookieStore = cookies()
//     const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

//     const req_data = await request.json()
//     const { data, error } = await supabase.from('ledger_accounts').insert(req_data).select()

//     if (data) {
//         const account = await fetch('https://api.openaccounting.io/orgs/dbc34c3b097bd27e8827a863ff252881/accounts', {
//             method: 'POST',
//             headers: {
//                 'accept-version': '^1.3.0',
//                 'content-type': 'application/json'
//             },
//             body: JSON.stringify({
//                 "id": await md5(data[0].id).toString(),
//                 "orgId": "dbc34c3b097bd27e8827a863ff252881",
//                 "inserted": null,
//                 "updated": null,
//                 "name": data[0].first_name + " " + data[0].last_name + " - " + data[0].id,
//                 "parent": "89644d90ec9bfb22f31e548db9c1ae73",
//                 "currency": "USD",
//                 "precision": 2,
//                 "debitBalance": true,
//                 "recentTxCount": 0
//             })
//         }).then(res => res.json())

//         return Response.json({ 
//             ...data[0],
//             balance: (account.balance ? account.balance : 0)
//         })
//     }

// }

export async function GET(request: NextRequest) {

//     const cookieStore = cookies()
//     const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

//     const { data, error } = await supabase.from('ledger_accounts').select()
//     if (data && data.length > 0) {
//         const account = await fetch(`https://api.openaccounting.io/orgs/dbc34c3b097bd27e8827a863ff252881/accounts/${await md5(data[0].id).toString()}`, {
//             headers: {
//                 'accept-version': '^1.3.0',
//                 'content-type': 'application/json'
//             },
//         })
//         .then(res => res.json())
//         console.log(account)
//         return Response.json({ 
//             ...data[0],
//             balance: account.balance
//         })
//     } else {
//         return Response.json({}, {status: 404})
//     }

    return Response.json({})

}