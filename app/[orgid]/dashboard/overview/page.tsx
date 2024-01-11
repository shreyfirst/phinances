'use client'
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Table, Button, Modal, Accordion, Text, TextInput, Skeleton, Radio, Title, Container, InputBase, useCombobox, Stack, Flex, Stepper, NavLink, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { isEmail, isNotEmpty, useForm } from '@mantine/form';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs'

export default function Dashboard({ params }: { params: { orgid: string } }) {
    const [session, setSession] = useState(null);
    const [regForm, regFormHandler] = useDisclosure(false);
    const [modalOpen, { open, close }] = useDisclosure(false);
    const [errors, setErrors] = useState({
        ledger_loading: true
    })
    const supabase = createClientComponentClient()
    const regFormData = useForm({
        initialValues: {
            first_name: '',
            last_name: '',
            email_address: ''
        },
        validate: {
            first_name: isNotEmpty(),
            last_name: isNotEmpty(),
            email_address: isEmail()
        },
    });
    const paymentFormData = useForm({
        initialValues: {
            ledger_transaction_id: '',
            bank_account_id: '',
            // balance_verify: false
        },
        validate: {
            ledger_transaction_id: isNotEmpty(),
            bank_account_id: isNotEmpty(),
            // balance_verify: isNotEmpty()
        },
    });
    const [ledger, setLedger] = useState(null)

    const [currentTransactions, setCurrentTransactions] = useState([])
    const [laterTransactions, setLaterTransactions] = useState([])
    const [oldTransactions, setOldTransactions] = useState([])

    const [bankAccounts, setBankAccounts] = useState([])
    const bank_select = useCombobox({
        onDropdownClose: () => bank_select.resetSelectedOption(),
    });
    const router = useRouter()
    const [titleData, setTitleData] = useState([])

    useEffect(() => {

        if (paymentFormData.values.ledger_transaction_id.length > 0) {
            let title;

            const ct = currentTransactions.find((transaction) => {
                if (transaction.id == paymentFormData.values.ledger_transaction_id) {
                    title = transaction
                    return true
                }
            })
            const lt = laterTransactions.find((transaction) => {
                if (transaction.id == paymentFormData.values.ledger_transaction_id) {
                    title = transaction
                    return true
                }
            })
    
            setTitleData([title])
        }

    }, [paymentFormData.values.ledger_transaction_id])

    useEffect(() => {
        const user = supabase.from('ledger_accounts').select().eq('org_id', params.orgid).then(async (res) => {
            if (res.data.length > 0) {
                await setLedger(res.data[0])
            } else {
                await regFormHandler.open()
            }
            setErrors({ ...errors, ledger_loading: false })
        })

        supabase.from('ledger_transactions').select().filter('due_date', 'lt', dayjs().add(5, 'day').toISOString()).neq('true_amount', 0).order('created_at', { ascending: false }).then(async (res) => {
            setCurrentTransactions(res.data)
        })
        supabase.from('ledger_transactions').select().filter('due_date', 'gte', dayjs().add(5, 'day').toISOString()).neq('true_amount', 0).order('created_at', { ascending: false }).then(async (res) => {
            setLaterTransactions(res.data)
        })
        supabase.from('ledger_transactions').select().eq('true_amount', 0).order('created_at', { ascending: false }).then(async (res) => {
            setOldTransactions(res.data)
        })

        const bank_acounts = supabase.from('bank_accounts').select('*').then((res) => {
            setBankAccounts(res.data)
        })
    }, [])

    const submitDataForm = async (dataFormValues) => {
        setErrors({ ...errors, ledger_loading: true })
        await supabase.from('ledger_accounts').insert({
            ...dataFormValues,
            org_id: params.orgid,
            first_name: formatName(dataFormValues.first_name),
            last_name: formatName(dataFormValues.last_name)
        })
        const { data, error } = await supabase.from('ledger_accounts').select().eq('org_id', params.orgid)
        if (data) {
            const user = await supabase.from('ledger_accounts').select().eq('org_id', params.orgid).then(async (res) => {
                if (res.data.length > 0) {
                    supabase.from('ledger_transactions').select().filter('due_date', 'lt', dayjs().add(5, 'day').toISOString()).neq('true_amount', 0).order('created_at', { ascending: false }).then(async (res) => {
                        setCurrentTransactions(res.data)
                    })
                    supabase.from('ledger_transactions').select().filter('due_date', 'gte', dayjs().add(5, 'day').toISOString()).neq('true_amount', 0).order('created_at', { ascending: false }).then(async (res) => {
                        setLaterTransactions(res.data)
                    })
                    supabase.from('ledger_transactions').select().eq('true_amount', 0).order('created_at', { ascending: false }).then(async (res) => {
                        setOldTransactions(res.data)
                    })
                    await setLedger(res.data[0])
                }
            })
            await setErrors({ ...errors, ledger_loading: false })
            regFormHandler.close()
        }

    }

    const formatName = (name) => {
        return name
            .trim()
            .toLowerCase()
            .replace(/(?:^|\s)\S/g, (a) => a.toUpperCase())
    };

    const submitPaymentForm = async (dataFormValues) => {
        setErrors({ ...errors, ledger_loading: true })
        const payment = await fetch("/api/transaction", {
            method: "POST",
            body: JSON.stringify({
                "amount": titleData[0].true_amount,
                "description": titleData[0].description,
                "bank_account_id": paymentFormData.values.bank_account_id,
                "transaction_id": paymentFormData.values.ledger_transaction_id
            })
        }).then(async (res) => {
            const a = await res.json()
            Promise.all([
                supabase.from('ledger_transactions').select().filter('due_date', 'lt', dayjs().add(5, 'day').toISOString()).neq('true_amount', 0).order('created_at', { ascending: false }),
                supabase.from('ledger_transactions').select().filter('due_date', 'gte', dayjs().add(5, 'day').toISOString()).neq('true_amount', 0).order('created_at', { ascending: false }),
                supabase.from('ledger_transactions').select().eq('true_amount', 0).order('created_at', { ascending: false })
            ]).then(([currentResult, laterResult, oldResult]) => {
                setCurrentTransactions(currentResult.data);
                setLaterTransactions(laterResult.data);
                setOldTransactions(oldResult.data);
            })
            return a.data[0]
        })

        await setErrors({ ...errors, ledger_loading: false })
        close()
    }

    const transactionMessage = (inflow, outflow) =>
        inflow > 0 ?
            `$${Math.abs(inflow / 100).toFixed(2)} debited` :
            outflow < 0 ?
                `$${Math.abs(outflow / 100).toFixed(2)} credited` :
                'No transaction';

    return (
        <div>
            <Modal opened={modalOpen}
                title={titleData.length > 0 ? (<Text>{(titleData[0].true_amount < 0 ? "Pay" : "Collect")} <Text fw={700} span>${Math.abs(titleData[0].true_amount / 100).toFixed(2)}</Text> for <Text fw={700} span>{titleData[0].description}</Text>.</Text>) : <></>}
                onClose={close}>

                <form onSubmit={paymentFormData.onSubmit(submitPaymentForm)}>
                    {/* <TextInput mb={12} label="Pay from" placeholder="" {...form.getInputProps('email_address')} /> */}

                    <Radio.Group
                        size='md'
                        value={paymentFormData.values.bank_account_id}
                        onChange={(bank) => { paymentFormData.setFieldValue('bank_account_id', bank) }}
                        name="bankAccountSelect"
                        label={`Select which bank to ${(titleData.length > 0 ? (titleData[0].true_amount < 0 ? "charge" : "reimburse") : null)}`}
                        withAsterisk
                        mb={30}>
                        <Stack mt={8} gap={"xs"}>
                            {bankAccounts.length > 0 ? bankAccounts.map((item) => (
                                (<Radio key={item.id} value={item.id} disabled={item.ready != "ready"} label={`${item.description} (${(item.ready != "ready" ? "UNVERIFIED" : "..." + item.mask)})`} />)
                            )) : <div>
                                <Text>There are no banks connected. <Link href='payment-methods'><Text className='no-underline' span>Add one first.</Text></Link></Text>
                            </div>}

                        </Stack>
                    </Radio.Group>

                    {/* { (paymentFormData.values.balance_verify ? (<Text>We&apos;re verifying your bank balance</Text>) : (<> </>)) } */}

                    <Button type='submit'
                        {...(errors.ledger_loading ? { loading: true } : {})}
                    >Submit</Button>
                </form>

            </Modal>

            <Title order={3}>Billing center</Title>

            {regForm ? (<form onSubmit={regFormData.onSubmit((data) => { submitDataForm(data) })}>
                <Text mb={12}>We&apos;re missing some of your information.</Text>
                <Flex className='gap-4 mb-2'>
                    <TextInput size='md' label="First name" placeholder="" {...regFormData.getInputProps('first_name')} />
                    <TextInput size='md' label="Last name" placeholder="" {...regFormData.getInputProps('last_name')} />
                </Flex>

                <TextInput size='md' mb={12} label="Email" type="email" placeholder="" {...regFormData.getInputProps('email_address')} />


                <Button type="submit"
                    {...(errors.ledger_loading ? { loading: true } : {})}
                >Submit</Button>




            </form>) : (<></>)}

            {ledger ? <div>
                <Text size='lg' mb={12}>{
                    (ledger.balance >= 0 ? (ledger.balance == 0 ?
                        <Text>You don&apos;t owe any money</Text> :  // 0 
                        <Text>You have balance credit of ${Math.abs(ledger.balance / 100).toFixed(2)}</Text>) :  // credit
                        <Text>You owe ${Math.abs(ledger.balance / 100).toFixed(2)}</Text>) // debit
                }</Text>
                <Accordion variant="filled" defaultValue="current">

                    <Accordion.Item key={"current"} value={"current"}>
                        <Accordion.Control>Due this week</Accordion.Control>


                        <Accordion.Panel className='overflow-x-auto'>

                            <ScrollArea className='min-w-96'>

                                <Table>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Due date</Table.Th>
                                            {/* <Table.Th>Date</Table.Th> */}
                                            <Table.Th>Description</Table.Th>
                                            <Table.Th>Amount</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {currentTransactions.map((value) => {
                                            return (
                                                <Table.Tr key={value.id}>
                                                    <Table.Td> <Text size="sm">{new Date(value.due_date).toDateString()}</Text></Table.Td>
                                                    {/* <Table.Td>{new Date(value.created_at).toDateString()}</Table.Td> */}
                                                    <Table.Td>{value.description}</Table.Td>
                                                    <Table.Td>
                                                        {value.approved == true ? (value.true_amount !== 0 ? (
                                                            <Button size='compact-sm' onClick={() => {
                                                                paymentFormData.setFieldValue('ledger_transaction_id', value.id);
                                                                open();
                                                            }}>
                                                                {value.true_amount < 0 ?
                                                                    `Pay $${Math.abs(Number(value.true_amount) / 100).toFixed(2)}` :
                                                                    `Collect $${(Number(value.true_amount) / 100).toFixed(2)}`}
                                                            </Button>
                                                        ) : (
                                                            <Text size='sm'>{transactionMessage(value.inflow, value.outflow)}</Text>
                                                        )) : <Text size='sm'>Awaiting approval</Text>}
                                                    </Table.Td>

                                                    {/* <Table.Td><Input variant="unstyled"></Input></Table.Td> */}
                                                </Table.Tr>
                                            )
                                        })}
                                    </Table.Tbody>

                                </Table>

                            </ScrollArea>
                            {
                                currentTransactions.length == 0 ? <Text my={50} className='text-center'>Nothing due this week. Lucky you!</Text> : <></>
                            }

                        </Accordion.Panel>

                    </Accordion.Item>

                    {
                        laterTransactions.length !== 0 ? <Accordion.Item key={"later"} value={"later"}>
                            <Accordion.Control>Due later</Accordion.Control>


                            <Accordion.Panel className='overflow-x-auto'>

                                <ScrollArea className='min-w-96'>

                                    <Table>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Due date</Table.Th>
                                                {/* <Table.Th>Date</Table.Th> */}
                                                <Table.Th>Description</Table.Th>
                                                <Table.Th>Amount</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {laterTransactions.map((value) => {
                                                return (
                                                    <Table.Tr key={value.id}>
                                                        <Table.Td> <Text size="sm">{new Date(value.due_date).toDateString()}</Text></Table.Td>

                                                        {/* <Table.Td>{new Date(value.created_at).toDateString()}</Table.Td> */}
                                                        <Table.Td>{value.description}</Table.Td>
                                                        <Table.Td>
                                                            {value.true_amount !== 0 ? (
                                                                <Button size='compact-sm' onClick={() => {
                                                                    paymentFormData.setFieldValue('ledger_transaction_id', value.id);
                                                                    open();
                                                                }}>
                                                                    {value.true_amount < 0 ?
                                                                        `Pay $${Math.abs(Number(value.true_amount) / 100).toFixed(2)}` :
                                                                        `Collect $${(Number(value.true_amount) / 100).toFixed(2)}`}
                                                                </Button>
                                                            ) : (
                                                                <Text size='sm'>{transactionMessage(value.inflow, value.outflow)}</Text>
                                                            )}
                                                        </Table.Td>

                                                        {/* <Table.Td><Input variant="unstyled"></Input></Table.Td> */}
                                                    </Table.Tr>
                                                )
                                            })}
                                        </Table.Tbody>

                                    </Table>
                                </ScrollArea>


                            </Accordion.Panel>

                        </Accordion.Item> : <></>
                    }



                    <Accordion.Item key={"old"} value={"old"}>
                        <Accordion.Control>Past payments</Accordion.Control>


                        <Accordion.Panel className='overflow-x-auto'>

                            <ScrollArea className='min-w-96'>

                                <Table>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Due date</Table.Th>
                                            {/* <Table.Th>Date</Table.Th> */}
                                            <Table.Th>Description</Table.Th>
                                            <Table.Th>Amount paid</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {oldTransactions.map((value) => {
                                            return (
                                                <Table.Tr key={value.id}>
                                                    <Table.Td> <Text size="sm">{new Date(value.due_date).toDateString()}</Text></Table.Td>

                                                    {/* <Table.Td>{new Date(value.created_at).toDateString()}</Table.Td> */}
                                                    <Table.Td>{value.description}</Table.Td>
                                                    <Table.Td>
                                                        {value.true_amount !== 0 ? (
                                                            <Button size='compact-sm' onClick={() => {
                                                                paymentFormData.setFieldValue('ledger_transaction_id', value.id);
                                                                open();
                                                            }}>
                                                                {value.true_amount < 0 ?
                                                                    `Pay $${Math.abs(Number(value.true_amount) / 100).toFixed(2)}` :
                                                                    `Collect $${(Number(value.true_amount) / 100).toFixed(2)}`}
                                                            </Button>
                                                        ) : (
                                                            <Text size='sm'>{transactionMessage(value.inflow, value.outflow)}</Text>
                                                        )}
                                                    </Table.Td>

                                                    {/* <Table.Td><Input variant="unstyled"></Input></Table.Td> */}
                                                </Table.Tr>
                                            )
                                        })}
                                    </Table.Tbody>

                                </Table>
                            </ScrollArea>
                            {
                                oldTransactions.length == 0 ? <Text my={50} className='text-center'>No past payments</Text> : <></>
                            }

                        </Accordion.Panel>

                    </Accordion.Item>

                </Accordion>

                {/* {
                    transactions.length == 0 ? <Text mt={50} fw={700} className='text-center'>You have no transactions yet</Text> : <></>
                } */}
            </div> : <></>}
            {(errors.ledger_loading && !regForm) ? (<Skeleton height={"200px"} width={"100%"} />) : <></>}
        </div>
    );
}
