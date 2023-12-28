'use client';
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function SignOut({
    children,
}: {
    children: React.ReactNode
}) {
    
    const supabase = createClientComponentClient()
    supabase.auth.signOut()
    const router = useRouter()

    useEffect(()=>{
        if (router) {
            router.push('/')
        }
    }, [router])

}