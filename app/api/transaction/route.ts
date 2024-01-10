// export async function POST(request: NextRequest) {

// const cookieStore = cookies()
// const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

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

// export async function GET(request: NextRequest) {

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

// return Response.json({})

// }

import { NextRequest } from 'next/server';
import Increase from 'increase';
import { Exo_2 } from 'next/font/google';
import { SupabaseClient } from '@supabase/supabase-js';

// import { cookies } from 'next/headers'
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
// import { AuthResponse } from '@supabase/supabase-js';

const increase = new Increase({
  apiKey: process.env['INCREASE_API_KEY'], // This is the default and can be omitted
  environment: (process.env['ENVIRONMENT'] == 'production' ? 'production' : 'sandbox'), // defaults to 'production'
});

export async function POST(
  request: NextRequest
) {

  const body = await request.json()
  const supa = new SupabaseClient("https://zfdtxahxffjgbqqslppn.supabase.co", process.env.SUPABASE_MASTER)
  // const bank_account = await suapab

  const bank_account = await supa.from('bank_accounts').select().eq("id", body.bank_account_id)
  const bank_numbers = await supa.from('bank_numbers').select().eq("id", bank_account.data[0].numbers)
  const og_transaction = await supa.from('ledger_transactions').select().eq("id", body.transaction_id)
  const user = (await supa.auth.admin.getUserById(bank_account.data[0].user)).data.user.user_metadata
  const routing = await increase.routingNumbers.list({
    routing_number: bank_numbers.data[0].routing_number
  }).then((res) => {
    return res.data
  })

  if (og_transaction.data[0].approved == true) {

    if ((routing.length > 0 && routing[0].ach_transfers == "supported") || process.env.ENVIRONMENT == "sandbox") {
      const payment = await increase.achTransfers.create({
        // account_id: "account_1n7cmbcqo8a98f5xirzz",
        account_id: process.env["INCREASE_ARAP_ACCOUNT"],
        amount: og_transaction.data[0].true_amount,
        statement_descriptor: `DESC:(${og_transaction.data[0].description}) USER_NAME:(${user.first_name} ${user.last_name}) USER_ID:(${bank_account.data[0].user})`,
        account_number: bank_numbers.data[0].account_number,
        routing_number: bank_numbers.data[0].routing_number,
        unique_identifier: og_transaction.data[0].id,
        // individual_id: bank_account.data[0].user,
        standard_entry_class_code: "internet_initiated",
        company_name: "Phi Delt CAE",
        individual_name: `${user.first_name} ${user.last_name}`,
        require_approval: false
      })
      const flow = (og_transaction.data[0].amount > 0 ? { outflow: (og_transaction.data[0].true_amount * -1) } : { inflow: (og_transaction.data[0].true_amount * -1) })
      const transaction = await supa.from('ledger_transactions').update({
        increase: payment.id,
        ...flow
      }).eq('id', body.transaction_id).select()
      return Response.json(transaction)
    } else {
      return Response.json(routing)
    }

  } else {
    return Response.json({
      "error": "unauthorized"
    })
  }


}
