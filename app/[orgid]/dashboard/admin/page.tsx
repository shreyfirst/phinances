'use client';
import { ActionIcon, Badge, Button, Checkbox, Group, Modal, Pill, Radio, Tabs } from "@mantine/core";
import { useDisclosure, useListState } from "@mantine/hooks";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { IconCheck, IconEdit, IconEye, IconTrash, IconX } from "@tabler/icons-react";
import { DataTable } from 'mantine-datatable';
import { useEffect, useMemo, useState } from "react";
import AdminPaymentModal from "@/components/AdminPaymentModal"

export default function Admin({ params }: { params: { orgid: string } }) {

  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [reimbursements, setReimbursements] = useState([])
  const [budgets, setBudgets] = useState([])
  const supabase = createClientComponentClient()
  const [opened, { open, close, toggle }] = useDisclosure(false);

  useEffect(() => {

    supabase.rpc('as_admin', { "sql_query": "SELECT json_agg(t) FROM (select * from ledger_accounts order by first_name asc) t" })
      .then((res) => {
        setAccounts(res.data)
      })
    supabase.rpc('as_admin', { "sql_query": "SELECT json_agg(t) FROM (select * from ledger_transactions order by due_date desc) t" })
      .then((res) => {
        setTransactions(res.data)
      })
    supabase.rpc('as_admin', { "sql_query": "SELECT json_agg(t) FROM (select * from budget_accounts where type = 'PAYMENT_REQUESTS') t" })
      .then((res) => {
        const reimbursement_id = res.data[0].id
        // console.log(res.data)
        supabase.rpc('as_admin', { "sql_query": `SELECT json_agg(t) FROM (select bt.*, to_jsonb(lt) as ledger_transaction_json from budget_transactions bt join ledger_transactions lt on bt.ledger_transaction = lt.id where in_budget_id = '${reimbursement_id}' ) t` })
          .then((res) => {
            setReimbursements(res.data)
          })
      })
    supabase.rpc('as_admin', { "sql_query": "SELECT json_agg(t) FROM (select * from budget_accounts) t" })
      .then((res) => {
        setBudgets(res.data)
      })
  }, [])

  async function handleNewTransactions(newTransactions) {
    setTransactions([...newTransactions, ...transactions])
  }

  const findBudget = useMemo(() => {
    const budgetFinder = (budget_id) => {
      const budget = budgets.find((budget) => budget.id === budget_id)
      return budget ? budget : { name: null }
    }
    return budgetFinder
  }, [budgets])

  const findAccount = useMemo(() => {
    const accountFinder = (account_id) => {
      const account = accounts.find((account) => account.id === account_id)
      return account ? account : { name: null }
    }
    return accountFinder
  }, [accounts])

  async function reimbursementAction(approved: boolean, record: any) {
    if (approved) {
      const expense_budget = await budgets.find((budget)=>budget.type=="EXPENSE")
      const orginator = await findAccount(record.ledger_transaction_json.account_id)
      const [budgetTransaction, ledgerTransaction] = await Promise.all([
        supabase.from('budget_transactions').insert({
          in_budget_id: expense_budget.id,
          out_budget_id: record.in_budget_id,
          amount: record.amount,
          description: `Reimbursement to ${orginator.first_name} ${orginator.last_name} for ${record.description}`,
        }).select(),
        supabase.from('ledger_transactions').update({
          approved: true
        }).eq('id', record.ledger_transaction_json.id).select()
      ])
      console.log("budgetTransaction", budgetTransaction, "ledgerTransaction", ledgerTransaction)
    }
  }

  return (
    <>
      <AdminPaymentModal budgets={budgets} accounts={accounts} opened={opened} onClose={close} onNewTransactions={handleNewTransactions} title="" centered />
      <Tabs variant='outline' defaultValue="accounts">
        <Tabs.List>
          <Tabs.Tab value="accounts" >
            Accounts
          </Tabs.Tab>
          <Tabs.Tab value="payments" >
            Payments
          </Tabs.Tab>
          <Tabs.Tab value="reimbursements" >
            Reimbursements
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel pt={10} value="accounts">
          <DataTable
            noRecordsText="No records to show"
            minHeight={250}
            columns={[{ accessor: 'first_name' }, { accessor: 'last_name' }, { accessor: 'email_address' }, { accessor: 'balance', render: (record) => <Badge size='lg' color={record.balance < 0 ? "red" : "green"}>$ {(record.balance / 100).toFixed(2)}</Badge> }]}
            records={accounts}
          />
        </Tabs.Panel>

        <Tabs.Panel pt={10} value="payments">
          <Button fullWidth my={5} size="sm" onClick={toggle}>New</Button>
          <DataTable
            noRecordsText="No records to show"
            minHeight={250}
            columns={[
              {
                accessor: 'account_id',
                render: (record) => {
                  const similar = findAccount(record.account_id)
                  if (similar) return `${similar.first_name} ${similar.last_name}`
                }
              }, { accessor: 'description' }, { accessor: 'amount', render: (record) => <>$ {Math.abs(record.amount / 100).toFixed(2)}</> }, { accessor: 'true_amount', title: "Amount due", render: (record) => <Badge size='lg' color={(record.approved ? (record.true_amount < 0 ? "red" : "green") : "yellow")}>$ {(record.true_amount / 100).toFixed(2)}</Badge> },
              { accessor: 'due_date', render: (record) => new Date(record.due_date).toDateString() }
            ]}
            records={transactions}
          />
        </Tabs.Panel>


        <Tabs.Panel pt={10} value="reimbursements"> 
          {/* <Button fullWidth my={5} size="sm" onClick={toggle}>New</Button> */}
          <DataTable
            noRecordsText="No records to show"
            minHeight={250}
            columns={[{ accessor: 'created_at', render: (record) => new Date(record.created_at).toDateString() },
            {
              accessor: 'description',
            }, {
              accessor: 'Account', render: (record) => {
                const account = findAccount(record.ledger_transaction_json.account_id)
                return `${account.first_name} ${account.last_name}`

              }
            }, { accessor: 'out_budget_id', title: "Budget", render: (record) => findBudget(record.out_budget_id).name }, { accessor: 'amount', render: (record) => <>$ {Math.abs(record.amount / 100).toFixed(2)}</> }, {
              accessor: 'approve', render: (record) => {
                return (<Group gap={5}><ActionIcon color="green" variant="filled" onClick={()=>reimbursementAction(true, record)} aria-label="Approve">
                <IconCheck style={{ width: '70%', height: '70%' }} stroke={1.5} />
              </ActionIcon><ActionIcon color="red" variant="filled" aria-label="Deny">
                  <IconX style={{ width: '70%', height: '70%' }} stroke={1.5} />
                </ActionIcon></Group>)
              }, title: "Approve"
            },

            ]}
            records={reimbursements}
          />
        </Tabs.Panel>
      </Tabs>
    </>
  )

}


/*
{
                            accessor: 'actions',
                            title: 'Row actions',
                            textAlign: 'right',
                            render: (record) => (
                              <Group gap={4} justify="right" wrap="nowrap">
                                <ActionIcon
                                  size="sm"
                                  variant="subtle"
                                  color="green"
                                  onClick={() => showModal({ record, action: 'view' })}
                                >
                                  <IconEye size={16} />
                                </ActionIcon>
                                <ActionIcon
                                  size="sm"
                                  variant="subtle"
                                  color="blue"
                                  onClick={() => showModal({ record, action: 'edit' })}
                                >
                                  <IconEdit size={16} />
                                </ActionIcon>
                                <ActionIcon
                                  size="sm"
                                  variant="subtle"
                                  color="red"
                                  onClick={() => showModal({ record, action: 'delete' })}
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
                            ),
                          }
*/