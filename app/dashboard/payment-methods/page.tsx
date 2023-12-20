'use client'
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, Image, Text, Badge, Button, Group, SimpleGrid, Title, Flex, Skeleton } from '@mantine/core';
import { usePlaidLink, PlaidLinkOnSuccess } from "react-plaid-link";

export default function Dashboard() {
    const [bankAccounts, setBankAccounts] = useState([]);
    const supabase = createClientComponentClient()
    const [errors, setErrors] = useState({
        new_loading: false,
        accounts_loading: true
    })
    const [plaidToken, setPlaidToken] = useState("")
    const { open, ready } = usePlaidLink({
        token: plaidToken,
        onSuccess: async (public_token, metadata) => {
            setErrors({ ...errors, accounts_loading: true })
            const response = await fetch(`/dashboard/payment-methods/api/exchange?public_token=${public_token}`).then(async (res) => {
                const json = await res.json()
                setBankAccounts([...bankAccounts, ...json])
            });
            setErrors({ ...errors, accounts_loading: false, new_loading: false })
        },
        onExit: () => {
            setErrors({ ...errors, new_loading: false });
        }
      });

    useEffect(() => {
        if (ready) {
          open();
        }
      }, [ready, open]);

    const newBankAccount = async () => {
        setErrors({ ...errors, new_loading: true })
        const response = await fetch(`/dashboard/payment-methods/api/link?user=${(await supabase.auth.getUser()).data.user.id}`).then((res) => {
            return res.json()
        });
        await setPlaidToken(response.link_token)
    }

    useEffect(() => {
        supabase
            .from('bank_accounts')
            .select('*')
            .then((res) => {
                setBankAccounts(res.data)
            }).then(()=>{
                setErrors({ ...errors, accounts_loading: false })
            })
    }, [])

    return (
        <div>
            <Group>
                <Title order={3} my={10}>Payment methods</Title>
                <Button variant={((bankAccounts.length == 0 && errors.accounts_loading == false) ? 'filled' : 'outline')} size='xs' onClick={newBankAccount} loading={errors.new_loading} disabled={errors.accounts_loading}>Add new</Button>
            </Group>
            {/* {session ? <p>{session.phone}</p> : <></>} */}
            <Flex
            gap="sm"
            wrap="wrap"
            >
                {
                    bankAccounts.map((item) => {
                        return (<Card key={item.id} shadow="sm" padding="lg" radius="md" w={300} withBorder>

                            <Group justify="space-between">
                                <Text fw={500}>{item.description}</Text>

                            </Group>

                            <Text size="sm" c="dimmed">
                                {new Date(item.created_at).toDateString()}
                            </Text>

                            {/* <Button variant="light" color="red" fullWidth mt="md" radius="md">
                                Delete
                            </Button> */}
                        </Card>)
                    })
                }
               { errors.accounts_loading ?  <Skeleton height={100} width={300} /> : <></>}
               { (bankAccounts.length == 0 && errors.accounts_loading == false) ? <Text>There are no bank accounts connected.</Text> : <></>}
            </Flex>
        </div>
    );
}