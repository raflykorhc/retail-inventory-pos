import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useNavigate, useLocation } from "react-router-dom"
import { Loader2, AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/toast"

import { authService } from "../services/authService"
import { useAuthStore, isOwnerRole } from "../store/useAuthStore"
import { useSettingsStore } from "../store/useSettingsStore"

const loginSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(4, "Password minimal 4 karakter"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const { setAuth, isAuthenticated } = useAuthStore()
  const { settings, fetchSettings } = useSettingsStore()
  
  const navigate = useNavigate()
  const location = useLocation()

  React.useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const fromPath = location.state?.from?.pathname || ""
  const fromSearch = location.state?.from?.search || location.search || ""
  const from = fromPath ? fromPath + fromSearch : ""

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && useAuthStore.getState().user) {
      const currentUser = useAuthStore.getState().user;
      const defaultPath = isOwnerRole(currentUser?.role) ? "/dashboard" : "/";
      navigate(from && fromPath !== "/login" ? from : defaultPath, { replace: true })
    }
  }, [isAuthenticated, navigate, from, fromPath])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await authService.login(data)
      setAuth(response.token, response.user)
      
      toast.success("Berhasil Masuk", {
        description: `Selamat datang kembali, ${response.user.fullName || response.user.username}!`,
      })

      const defaultPath = isOwnerRole(response.user.role) ? "/dashboard" : "/";
      navigate(from && fromPath !== "/login" ? from : defaultPath, { replace: true })
    } catch (err: any) {
      const message = err.response?.data?.error || "Gagal masuk. Periksa kembali username dan password Anda."
      setError(message)
      toast.error("Login Gagal", {
        description: message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            Selamat Datang
          </CardTitle>
          <CardDescription>
            Silakan masuk ke {settings.shopName || "sistem"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm font-medium p-3 rounded-md flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              
              <Field>
                <FieldLabel htmlFor="username">Username / ID Karyawan</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="Masukkan username"
                  {...register("username")}
                  autoFocus
                />
                {errors.username && (
                  <p className="text-destructive text-xs font-medium">{errors.username.message}</p>
                )}
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Kata Sandi</FieldLabel>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.info("Hubungi Administrator", {
                        description: "Untuk alasan keamanan, silakan hubungi Manajer untuk mereset kata sandi Anda."
                      });
                    }}
                    className="ml-auto text-sm underline-offset-4 hover:underline text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Lupa Password?
                  </a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  {...register("password")} 
                />
                {errors.password && (
                  <p className="text-destructive text-xs font-medium">{errors.password.message}</p>
                )}
              </Field>

              <Field className="pt-2">
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Otentikasi...
                    </>
                  ) : (
                    "Masuk ke Sistem"
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        &copy; {new Date().getFullYear()} {settings.shopName || "Operational System"}
      </FieldDescription>
    </div>
  )
}

