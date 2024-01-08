'use client';
import { ActionIcon, Badge, Button, Checkbox, Group, Modal, Pill, Radio, Tabs } from "@mantine/core";
import { useDisclosure, useListState } from "@mantine/hooks";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { IconEdit, IconEye, IconTrash } from "@tabler/icons-react";
import { DataTable } from 'mantine-datatable';
import { useEffect, useState } from "react";
import AdminPaymentModal from "@/components/AdminPaymentModal"

export default function Admin() {

  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const supabase = createClientComponentClient()
  const [opened, { open, close, toggle }] = useDisclosure(false);

  useEffect(() => {
    
    supabase.rpc('as_admin', { "sql_query": "SELECT json_agg(t) FROM (select * from ledger_accounts order by first_name asc) t" })
      .then((res) => {
        setAccounts(res.data)
      })
    supabase.rpc('as_admin', { "sql_query": "SELECT json_agg(t) FROM (select * from ledger_transactions order by created_at desc) t" })
      .then((res) => {
        setTransactions(res.data)
      })
  }, [])

  async function handleNewTransactions(newTransactions) {
    setTransactions([...newTransactions, ...transactions])
  }

  return (
    <>
      <AdminPaymentModal accounts={accounts} opened={opened} onClose={close} onNewTransactions={handleNewTransactions} title="" centered/>
      <Tabs variant='outline' defaultValue="accounts">
        <Tabs.List>
          <Tabs.Tab value="accounts" >
            Accounts
          </Tabs.Tab>
          <Tabs.Tab value="payments" >
            Payments
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel pt={10} value="accounts">
          <DataTable
            columns={[{ accessor: 'first_name' }, { accessor: 'last_name' }, { accessor: 'email_address' }, { accessor: 'balance', render: (record) => <Badge size='lg' color={record.balance < 0 ? "red" : "green"}>$ {(record.balance/100).toFixed(2)}</Badge> }]}
            records={accounts}
          />
        </Tabs.Panel>

        <Tabs.Panel pt={10} value="payments">
        <Button fullWidth my={5} size="xs" onClick={toggle}>New</Button>
          <DataTable
            noRecordsText="No records to show"
            minHeight={150}
            columns={[
              {
                accessor: 'account_id',
                render: (record) => {
                  const similar = accounts.find((account) => {
                    if (account.id == record.account_id) {
                      return true
                    }
                  })
                  if (similar) return `${similar.first_name} ${similar.last_name}`
                }
              }, { accessor: 'description' }, { accessor: 'amount', render: (record) => <>${Math.abs(record.amount/100).toFixed(2)}</> }, { accessor: 'true_amount', title: "Amount due" , render: (record) => <Badge size='lg' color={record.true_amount < 0 ? "red" : "green"}>$ {(record.true_amount/100).toFixed(2)}</Badge> }
            ]}
            records={transactions}
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