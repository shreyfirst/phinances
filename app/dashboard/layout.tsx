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

export default function Demo({
    children,
}: {
    children: React.ReactNode
}) {
    const [opened, { toggle }] = useDisclosure();
    const [active, setActive] = useState(0);
    const router = useRouter()
    const [data, setData] = useState([
        { label: 'Dues & rent', description: 'Make a payment', url: '/dashboard/overview' },
        { label: 'Payment methods', description: 'Connect a bank', url: '/dashboard/payment-methods' },
        { label: 'Sign out', description: '', url: '/dashboard/signout' },
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
        supabase.auth.getUser().then((res) => {
            console.log(res.data)
            if ("admin" in res.data.user.app_metadata) {
                if (res.data.user.app_metadata.admin == true) {
                    setData([
                        { label: 'Administrate', description: 'God mode', url: '/dashboard/admin' },
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
                    <Text>Phi Delta Theta Finances</Text>
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