import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Forgot password — Senex" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex justify-center px-4 py-16">
      <ForgotPasswordForm />
    </div>
  );
}
