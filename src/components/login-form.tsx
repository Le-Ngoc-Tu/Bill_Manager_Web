"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useRef, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth"
import Image from "next/image"
import { FaRegUser } from "react-icons/fa"
import { CiLock } from "react-icons/ci"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { loginWithCredentials, verifyCode } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""])
  const [step, setStep] = useState<"login" | "verify">("login")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uuid, setUuid] = useState<string>("") // Lưu UUID cho xác thực 2 lớp
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Gọi API đăng nhập
      const result = await loginWithCredentials(username, password)

      // Nếu cần xác thực 2 lớp
      if (result.requireVerification) {
        setUuid(result.uuid)
        setStep("verify")
        // Focus vào ô input đầu tiên
        setTimeout(() => {
          if (codeInputRefs.current[0]) {
            codeInputRefs.current[0].focus()
          }
        }, 100)
      } else if (!result.success) {
        // Xử lý đăng nhập thất bại
        setError(result.message || "Tài khoản hoặc mật khẩu không chính xác")
      }
    } catch (error: any) {
      setError(error.message || "Đã xảy ra lỗi khi đăng nhập")
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Lấy mã xác thực từ 6 ô input
      const code = verificationCode.join("")

      // Gọi API xác thực
      const result = await verifyCode(username, uuid, code)

      if (!result.success) {
        // Xử lý xác thực thất bại
        setError(result.message || "Mã xác thực không chính xác")
        // Reset mã xác thực
        setVerificationCode(["", "", "", "", "", ""])
        // Focus vào ô input đầu tiên
        if (codeInputRefs.current[0]) {
          codeInputRefs.current[0].focus()
        }
      }
    } catch (error: any) {
      setError(error.message || "Đã xảy ra lỗi khi xác thực")
    } finally {
      setLoading(false)
    }
  }

  // Focus vào ô input đầu tiên khi chuyển sang bước xác thực
  useEffect(() => {
    if (step === "verify" && codeInputRefs.current[0]) {
      setTimeout(() => {
        codeInputRefs.current[0]?.focus()
      }, 100)
    }
  }, [step])

  // Xử lý nhập mã xác thực
  const handleCodeChange = (index: number, value: string) => {
    // Chỉ cho phép nhập số
    if (!/^\d*$/.test(value)) return

    // Cập nhật giá trị
    const newCode = [...verificationCode]
    newCode[index] = value.slice(0, 1) // Chỉ lấy 1 ký tự

    setVerificationCode(newCode)

    // Tự động chuyển đến ô tiếp theo
    if (value !== "" && index < 5) {
      codeInputRefs.current[index + 1]?.focus()
    }
  }

  // Xử lý xóa và quay về ô trước đó
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus()
    }
  }

  // Xử lý paste mã xác thực
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").trim()

    // Chỉ xử lý nếu paste đúng 6 số
    if (/^\d{6}$/.test(pastedData)) {
      const newCode = pastedData.split("")
      setVerificationCode(newCode)

      // Focus vào ô cuối cùng
      codeInputRefs.current[5]?.focus()
    }
  }

  return (
    <div
      className={cn("min-h-screen flex items-center justify-center", className)}
      style={{
        background: "linear-gradient(to bottom, rgba(179, 225, 255, 0.1) 0%, rgba(255, 255, 255, 1) 40%)",
        paddingTop: 0,
        paddingBottom: 0
      }}
      {...props}
    >
      <div
        className="w-full max-w-xl p-0 mx-2 sm:mx-4 bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-3xl shadow-lg overflow-hidden my-auto"
        style={{ boxShadow: "0 10px 30px rgba(72, 187, 120, 0.3)" }}
      >
        <div
          className="flex flex-col items-center mb-6 sm:mb-8 py-6 sm:py-8 px-4 sm:px-6 md:px-10 w-full rounded-t-xl sm:rounded-t-3xl"
          style={{
            background: "linear-gradient(to bottom, #5e9eff20 0%, #ffffff 100%)",
            backgroundImage: `
              linear-gradient(to bottom, #5e9eff20 0%, #ffffff 100%),
              linear-gradient(to right, rgba(130, 170, 255, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(130, 170, 255, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: "100% 100%, 20px 20px, 20px 20px",
            marginTop: "0"
          }}
        >
          <Image
            src="/NLTECH.png"
            alt="NLTECH Logo"
            width={80}
            height={80}
            className="w-[80px] h-[80px] sm:w-[110px] sm:h-[110px] mb-2"
          />
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900">
            NL TECH
          </h2>
        </div>

        {step === "verify" && (
          <div className="mb-8 text-center px-4 sm:px-6 md:px-10">
            <h1 className="text-xl sm:text-2xl font-semibold text-center">Xác thực 2 lớp</h1>
            <p className="text-sm text-center text-gray-500 mt-2">
              Nhập mã xác thực 6 số được gửi đến thiết bị của bạn
            </p>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-5 mx-4 sm:mx-6 md:mx-10">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === "login" ? (
          <form onSubmit={handleLogin} className="space-y-6 px-4 sm:px-6 md:px-10 pb-4 sm:pb-6 md:pb-10">
            <div className="space-y-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <FaRegUser size={20} />
                </div>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Tên đăng nhập"
                  className="pl-10 h-12 text-base rounded-lg border-gray-300"
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <CiLock size={22} />
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="pl-10 h-12 text-base rounded-lg border-gray-300"
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium bg-gray-900 hover:bg-black rounded-lg mt-4"
              style={{ height: '48px' }}
              disabled={loading}
            >
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6 px-4 sm:px-6 md:px-10 pb-4 sm:pb-6 md:pb-10">
            <div className="space-y-3">
              <div className="flex justify-between gap-1 sm:gap-3">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <Input
                    key={index}
                    ref={(el) => {
                      codeInputRefs.current[index] = el;
                      return undefined;
                    }}
                    value={verificationCode[index]}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    maxLength={1}
                    className="w-full h-12 sm:h-16 text-center text-base sm:text-lg font-semibold rounded-lg sm:rounded-xl"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                  />
                ))}
              </div>
              <p className="text-sm text-gray-500 text-center mt-2">
                Nhập mã xác thực 6 số (demo: 123456)
              </p>
            </div>
            <div className="flex flex-col gap-3 mt-4">
              <Button
                type="submit"
                className="w-full h-12 sm:h-14 text-sm sm:text-base font-medium bg-gray-900 hover:bg-black rounded-lg sm:rounded-xl"
                disabled={loading || verificationCode.some(v => v === "")}
              >
                {loading ? "Đang xử lý..." : "Xác thực"}
              </Button>
              <Button
                variant="outline"
                type="button"
                className="w-full h-12 sm:h-14 text-sm sm:text-base font-medium border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg sm:rounded-xl"
                onClick={() => setStep("login")}
                disabled={loading}
              >
                Quay lại
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
