'use client';
import { LoadingOverlay } from "@mantine/core";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function SignOut() {
    
    const supabase = createClientComponentClient()
    supabase.auth.signOut()
    const router = useRouter()

    useEffect(()=>{
        window.location.assign(window.location.href.replace(window.location.pathname,''))
    },[supabase.auth])

    return (<div>
        <LoadingOverlay
            visible
            w={"100%"}
            h={"100%"}
        />
    </div>)

}