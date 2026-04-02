import { AuthPanel } from "@/components/auth-panel";

export default function AuthPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">로그인 / 회원가입</h1>
      <AuthPanel />
    </div>
  );
}
