'use client'
import { useDisclosure } from '@mantine/hooks';
import { AppShell, Burger, Group, Table, Stack, Menu, Text, TextInput, Button } from '@mantine/core';
import { Box, NavLink } from '@mantine/core';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Modal } from '@mantine/core';
import { isEmail, isNotEmpty, useForm } from '@mantine/form';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter, usePathname } from 'next/navigation';

const insert = (arr, index, newItem) => [
    // part of the array before the specified index
    ...arr.slice(0, index),
    // inserted item
    newItem,
    // part of the array after the specified index
    ...arr.slice(index)
]

export default function Demo({
    children, params
}: {
    children: React.ReactNode,
    params: { orgid: string }
}) {
    const [opened, { toggle }] = useDisclosure();
    const [active, setActive] = useState(0);
    const [org, setOrg] = useState({ name: "" })
    const router = useRouter()
    const [data, setData] = useState([
        { label: 'Dues & rent', description: 'Make a payment', url: `/${params.orgid}/dashboard/overview` },
        { label: 'Payment methods', description: 'Connect a bank', url: `/${params.orgid}/dashboard/payment-methods` },
        { label: 'Sign out', description: '', url: `/${params.orgid}/dashboard/signout` },
        // { label: 'Payment history', description: 'See past payments', url: '/dashboard/1' },
    ])

    const supabase = createClientComponentClient()

    const path = usePathname()
    useEffect(() => {
        const currentPath = path;
        const activeIndex = data.findIndex(item => currentPath.includes(item.url));
        if (activeIndex !== -1) {
            setActive(activeIndex);
        }
    }, [path, data]);

    useEffect(() => {
        // supabase.from('orgs')
        supabase.from('orgs').select().eq('id', params.orgid).then(async (res) => {
            setOrg(res.data[0])
            if (res.data[0].budgets == true) {
                console.log([
                    // part of the array before the specified index
                    ...data.slice(0, 2),
                    // inserted item
                    { label: 'Manage budgets', description: 'Request reimbursements', url: `/${params.orgid}/dashboard/budgets` },
                    // part of the array after the specified index
                    ...data.slice(2)
                ])
                setData([
                    // part of the array before the specified index
                    ...data.slice(0, 2),
                    // inserted item
                    { label: 'Manage budgets', description: 'Request reimbursements', url: `/${params.orgid}/dashboard/budgets` },
                    // part of the array after the specified index
                    ...data.slice(2)
                ])
            }
        })
        supabase.auth.getUser().then((res) => {
            if ("admin" in res.data.user.app_metadata) {
                if (res.data.user.app_metadata.admin == true) {
                    setData([
                        { label: 'Administrate', description: 'God mode', url: `/${params.orgid}/dashboard/admin` },
                        ...data
                    ])
                }
            }
        })
    }, [])

    const items = data.map((item, index) => (
        <NavLink
            key={item.label}
            active={index === active}
            label={item.label}
            description={item.description}
            onClick={() => {
                toggle()
            }}
            component={Link}
            href={item.url}
        />
    ));

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md">
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />

                    {/* <MantineLogo size={30} /> */}
                    <Text>{`${org.name}`} Finances</Text>
                </Group>
            </AppShell.Header>
            <AppShell.Navbar p="md">
                Navigation
                <Stack
                    gap="xs"
                    my="xs"
                >
                    <Box>{items}</Box>
                </Stack>
                {/* {Array(15)
          .fill(0)
          .map((_, index) => (
            <Skeleton key={index} h={28} mt="sm" animate={false} />
          ))} */}
            </AppShell.Navbar>
            <AppShell.Main>{children}</AppShell.Main>
        </AppShell>
    );
}