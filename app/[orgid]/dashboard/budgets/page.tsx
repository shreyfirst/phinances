'use client';
import { ActionIcon, Badge, Button, Checkbox, Table, Text, Modal, Pill, Radio, Tabs, Card, Flex, Stack, Group, Input, SimpleGrid, Combobox, useCombobox, InputBase, NumberInput, ScrollArea, Menu, InputLabel, Box, rem, LoadingOverlay } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure, useListState } from "@mantine/hooks";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { IconEdit, IconEye, IconMenu2, IconSquareRoundedPlus, IconTrash } from "@tabler/icons-react";
import { DataTable } from 'mantine-datatable';
import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from 'dayjs'

export default function Budgets({ params }: { params: { orgid: string } }) {

  const supabase = createClientComponentClient()
  const [budgets, setBudgets] = useState([])
  const viewport = useRef<HTMLDivElement>(null);
  const [inTransactions, setInTransactions] = useState([])
  const [outTransactions, setOutTransactions] = useState([])
  const [activeBudget, setActiveBudget] = useState({ id: null })
  const [reimbursementBudget, setReimbursementBudget] = useState({ id: null })
  const [newBudgetOpen, newBudgetHandler] = useDisclosure(false);
  const [loading, setLoading] = useState(false)
  const budgets_in = useCombobox({
    onDropdownClose: () => budgets_in.resetSelectedOption(),
  });
  const budgets_out = useCombobox({
    onDropdownClose: () => budgets_out.resetSelectedOption(),
  });
  const [budgetTransferOpen, budgetTransferHandler] = useDisclosure(false)
  const [reimbursementOpen, reimbursementHandler] = useDisclosure(false);
  const newBudget = useForm({
    initialValues: {
      name: '',
      private: false,
      org_id: params.orgid
    },
    validate: {
      name: (value) => (value.length < 3 ? "Length must be minimum three characters" : null)
    }
  });
  const budgetTransfer = useForm({
    initialValues: {
      in_budget_id: '',
      out_budget_id: '',
      amount: 0,
      description: '',
      org_id: params.orgid
    },
    validate: {
      description: (value) => (value.length < 3 ? "Length must be minimum three characters" : null)
    }
  })
  const reimbursementRequest = useForm({
    initialValues: {
      in_budget_id: '',
      out_budget_id: '',
      amount: 0,
      description: '',
      org_id: params.orgid
    },
    validate: {
      description: (value) => (value.length < 3 ? "Length must be minimum three characters" : null)
    }
  });

  useEffect(() => {
    setLoading(true)
    supabase.from('budget_accounts').select().eq('org_id', params.orgid).order('name').then((res) => {
      const public_budgets = res.data.filter((budget) => {
        if (budget.private == false) {
          return true
        }
      })
      setBudgets(public_budgets)
      const reimburse = res.data.find((budget) => budget.type == "PAYMENT_REQUESTS")
      setReimbursementBudget(reimburse)
      setLoading(false)
    })

  }, [])


  useEffect(() => {

    if (activeBudget.id) {
      supabase.from('budget_transactions').select().eq('org_id', params.orgid).eq('in_budget_id', activeBudget["id"]).then((res) => setInTransactions(res.data))
      supabase.from('budget_transactions').select().eq('org_id', params.orgid).eq('out_budget_id', activeBudget["id"]).then((res) => setOutTransactions(res.data))
      viewport.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      setInTransactions([])
      setOutTransactions([])
    }

  }, [activeBudget])

  function submitNewBudget(formData) {
    supabase.from('budget_accounts').insert(formData).select().then((res) => {
      setBudgets([...budgets, ...res.data])
      newBudgetHandler.close()
    })
  }

  async function createTransfer(formData) {

    let transaction = null;
    setLoading(true)

    if (formData.in_budget_id == reimbursementBudget.id) {
      const account_id = await supabase.from('ledger_accounts').select().eq('org_id', params.orgid).then(async (res) => {
          return res.data[0].id
    })
      transaction = await supabase.from('ledger_transactions').insert({
        account_id: account_id,
        amount: (formData.amount * 100),
        approved: false,
        description: `Reimbursement: ${formData.description}`,
        due_date: dayjs().add(3, 'day').toISOString(),
        org_id: params.orgid
      }).select().then((res)=>res.data[0])

    }

    supabase.from('budget_transactions').insert({
      ...formData,
      ledger_transaction: transaction.id,
      amount: (formData.amount * 100)
    }).select().then((res) => {
      budgetTransferHandler.close()
      reimbursementHandler.close()
      setActiveBudget({ id: null })
      supabase.from('budget_accounts').select().eq('org_id', params.orgid).order('name').then((res) => {
        const public_budgets = res.data.filter((budget) => {
          if (budget.private == false) {
            return true
          }
        })
        setBudgets(public_budgets)
        const reimburse = res.data.find((budget) => budget.type == "PAYMENT_REQUESTS")
        setReimbursementBudget(reimburse)
        setLoading(false)

      })
    })
  }

  // async function findBudget(budget_id) {
  //   const budget = budgets.find((budget) => budget.id === budget_id)
  //   return budget ? budget.name : null
  // }


  const findBudget = useMemo(() => {
    const budgetFinder = (budget_id) => {
      const budget = budgets.find((budget) => budget.id === budget_id)
      return budget ? budget.name : null
    }
    return budgetFinder
  }, [budgets])


  return (
    <>
      <Modal opened={newBudgetOpen} onClose={newBudgetHandler.close} title="Create a new budget">
        <form onSubmit={newBudget.onSubmit(submitNewBudget)}>
          <Input.Wrapper mb={15} required label="Budget name" {...newBudget.getInputProps('name')}>
            <Input placeholder={"Social"} {...newBudget.getInputProps('name')} />
          </Input.Wrapper>
          <Input.Wrapper required mb={15} description={"Public budgets & their transactions can be seen by everyone"} label={`Budget visibility`}>
            <SimpleGrid cols={2} mt={10} spacing="xs">
              <Button fullWidth
                onClick={() => newBudget.setFieldValue('private', false)}
                variant={newBudget.values.private ? "outline" : "filled"}>Public</Button>
              <Button fullWidth
                onClick={() => newBudget.setFieldValue('private', true)}
                variant={newBudget.values.private ? "filled" : "outline"}>Private</Button>
            </SimpleGrid>
          </Input.Wrapper>
          <Button type='submit'>Submit</Button>
        </form>

      </Modal>
      <Modal opened={budgetTransferOpen} onClose={budgetTransferHandler.close} title="Transfer money between budgets">
        <form onSubmit={budgetTransfer.onSubmit(createTransfer)}>

          <Input.Wrapper mb={10} required label="Transfer from">
            <Combobox
              store={budgets_out}
              onOptionSubmit={(val) => {
                budgetTransfer.setFieldValue('out_budget_id', val)
                budgets_out.closeDropdown();
              }}
              size="xs"
            >
              <Combobox.Target>
                <InputBase
                  component="button"
                  type="button"
                  pointer
                  rightSection={<Combobox.Chevron />}
                  rightSectionPointerEvents="none"
                  onClick={() => budgets_out.toggleDropdown()}
                  size="sm"
                  my={5}
                >
                  {<Text>{findBudget(budgetTransfer.values.out_budget_id)}</Text> || <Input.Placeholder>Pick value</Input.Placeholder>}
                </InputBase>
              </Combobox.Target>

              <Combobox.Dropdown>
                <Combobox.Options>{budgets.map((item) => (
                  <Combobox.Option value={item.id} key={item.id}>
                    {item.name}
                  </Combobox.Option>
                ))}</Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
          </Input.Wrapper>

          <Input.Wrapper mb={10} required label="Transfer to">

            <Combobox
              store={budgets_in}
              onOptionSubmit={(val) => {
                budgetTransfer.setFieldValue('in_budget_id', val)
                budgets_in.closeDropdown();
              }}
            // size="xs"
            >
              <Combobox.Target>
                <InputBase
                  component="button"
                  type="button"
                  pointer
                  rightSection={<Combobox.Chevron />}
                  rightSectionPointerEvents="none"
                  onClick={() => budgets_in.toggleDropdown()}
                  // size="sm"
                  my={5}
                >
                  {<Text>{findBudget(budgetTransfer.values.in_budget_id)}</Text> || <Input.Placeholder>Pick value</Input.Placeholder>}
                </InputBase>
              </Combobox.Target>

              <Combobox.Dropdown>
                <Combobox.Options>{budgets.map((item) => (
                  <Combobox.Option value={item.id} key={item.id}>
                    {item.name}
                  </Combobox.Option>
                ))}</Combobox.Options>
              </Combobox.Dropdown>
            </Combobox>
          </Input.Wrapper>

          <Input.Wrapper mb={15} required label="Amount" {...budgetTransfer.getInputProps('amount')}>
            <NumberInput thousandSeparator="," prefix="$ " decimalScale={2} {...budgetTransfer.getInputProps('amount')}></NumberInput>
          </Input.Wrapper>

          <Input.Wrapper mb={15} required label="Description" {...budgetTransfer.getInputProps('description')}>
            <Input placeholder="Saving for WQ25 Formal" {...budgetTransfer.getInputProps('description')}></Input>
          </Input.Wrapper>

          <Button type='submit'>Submit</Button>
        </form>

      </Modal>
      <Modal opened={reimbursementOpen} onClose={reimbursementHandler.close} title={
        <Text>Request money from <Text span fw={700}>{findBudget(reimbursementRequest.values.out_budget_id)}</Text> budget</Text>
      }>
        <form onSubmit={reimbursementRequest.onSubmit(createTransfer)}>

          <Input.Wrapper mb={15} required label="Amount" {...reimbursementRequest.getInputProps('amount')}>
            <NumberInput thousandSeparator="," prefix="$ " decimalScale={2} {...reimbursementRequest.getInputProps('amount')}></NumberInput>
          </Input.Wrapper>

          <Input.Wrapper mb={15} required label="Description" {...reimbursementRequest.getInputProps('description')}>
            <Input placeholder="Chipotle for WQ25 rush day 2" {...reimbursementRequest.getInputProps('description')}></Input>
          </Input.Wrapper>

          <Text size={'sm'} fw={700} mb={20}>Your request will not be approved unless you send an image of your reciept to Shrey on Slack.</Text>

          <Button type='submit'>Submit</Button>
        </form>

      </Modal>
      <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
      {/* <Group mb={20} gap={10}><Button onClick={newBudgetHandler.open}>Create new budget</Button><Button onClick={budgetTransferHandler.open}>Transfer</Button></Group> */}
      <Flex className="flex-1 flex-wrap" gap={10} mb={20}>
        {budgets.map((item) => {
          return (<Card key={item.id} radius={'md'} withBorder={(item.id == activeBudget.id)} >
            <Stack gap={0}>

              <Group gap={20}><Text size='sm'>{item.name} (<Text span fw={700}>${(item.balance / 100).toFixed(2)}</Text>)</Text>

              </Group>
              <Group mt={10} gap={10}>
                <Checkbox size={'xs'}
                  labelPosition={"left"}
                  checked={item.id == activeBudget.id}
                  onChange={(e) => e.currentTarget.checked ? setActiveBudget(item) : setActiveBudget({ id: null })}
                  label="Show"
                  fw={600} className="border-solid p-2 border-slate-600	hover:bg-slate-700 rounded-md">


                </Checkbox>
                <Menu>
                  <Menu.Target>
                    <Box component={Group} className="border-solid p-2 border-slate-600	hover:bg-slate-700 rounded-md">
                      <Text size="xs" fw={600}>Menu</Text>
                    </Box>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item component="button" onClick={() => {
                      reimbursementRequest.setFieldValue('in_budget_id', reimbursementBudget.id)
                      reimbursementRequest.setFieldValue('out_budget_id', item.id)
                      reimbursementHandler.open()
                    }}>
                      Request reimbursement
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
                {/* <Button size="xs" variant={(activeBudget.id == item.id ? 'light' : 'transparent')}
                  onClick={() => setActiveBudget(item)}
                ></Button> */}


              </Group>
            </Stack>
          </Card>)
        })}
      </Flex>


     {activeBudget.id ? ( <Tabs variant="outline" defaultValue="expenses" ref={viewport}>
        <Tabs.List>
          <Tabs.Tab value="expenses">
            Expenses
          </Tabs.Tab>
          <Tabs.Tab value="revenue">
            Revenue
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="expenses" py={10}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                {/* <Table.Th>Date</Table.Th> */}
                <Table.Th>Description</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Paid to</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {outTransactions.map((value) => {
                return (
                  <Table.Tr key={value.id}>
                    <Table.Td> <Text size="sm">{new Date(value.created_at).toDateString()}</Text></Table.Td>
                    {/* <Table.Td>{new Date(value.created_at).toDateString()}</Table.Td> */}
                    <Table.Td>{value.description}</Table.Td>
                    <Table.Td>
                      $ {(value.amount / 100).toFixed(2)}
                    </Table.Td>
                    <Table.Td>
                    {findBudget(value.in_budget_id)}
                    </Table.Td>

                    {/* <Table.Td><Input variant="unstyled"></Input></Table.Td> */}
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
          {(outTransactions.length == 0 ? <Text my={40} className="text-center">There are no expense transactions.</Text> : null)}

        </Tabs.Panel>

        <Tabs.Panel value="revenue" py={10}>
        <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                {/* <Table.Th>Date</Table.Th> */}
                <Table.Th>Description</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Recieved from</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {inTransactions.map((value) => {
                return (
                  <Table.Tr key={value.id}>
                    <Table.Td> <Text size="sm">{new Date(value.created_at).toDateString()}</Text></Table.Td>
                    {/* <Table.Td>{new Date(value.created_at).toDateString()}</Table.Td> */}
                    <Table.Td>{value.description}</Table.Td>
                    <Table.Td>
                      $ {(value.amount / 100).toFixed(2)}
                    </Table.Td>
                    <Table.Td>
                      {findBudget(value.out_budget_id)}
                    </Table.Td>

                    {/* <Table.Td><Input variant="unstyled"></Input></Table.Td> */}
                  </Table.Tr>
                )
              })}
            </Table.Tbody>
          </Table>
          {(inTransactions.length == 0 ? <Text my={40} className="text-center">There are no incoming transactions.</Text> : null)}

        </Tabs.Panel>

      </Tabs>) : <Text my={50} className="text-center">Select a budget to show transactions</Text>}

    </>
  )

}

