"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, CircleAlert, CircleCheck, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";

export function LoginForm({ action, hasError, loggedOut }: { action: (formData: FormData) => Promise<void>; hasError: boolean; loggedOut: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <form action={action} className="login-form">
      <div className="login-lock-mark" aria-hidden="true"><LockKeyhole size={28} /></div>
      <div className="login-form-heading"><h1>เข้าสู่ระบบ</h1><p>ยินดีต้อนรับกลับสู่ PowerCare</p></div>
      {hasError ? <p className="login-message login-message-error" id="login-error" role="alert"><CircleAlert size={18} aria-hidden="true" /><span>ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง</span></p> : null}
      {loggedOut ? <p className="login-message login-message-success" role="status"><CircleCheck size={18} aria-hidden="true" /><span>ออกจากระบบเรียบร้อยแล้ว</span></p> : null}
      <div className="login-field">
        <label htmlFor="login-username">ชื่อผู้ใช้</label>
        <input id="login-username" name="username" required autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Username" aria-invalid={hasError || undefined} aria-describedby={hasError ? "login-error" : undefined} />
      </div>
      <div className="login-field">
        <label htmlFor="login-password">รหัสผ่าน</label>
        <div className="login-password-wrap">
          <input id="login-password" name="password" required autoComplete="current-password" type={showPassword ? "text" : "password"} placeholder="Password" aria-invalid={hasError || undefined} aria-describedby={hasError ? "login-error" : undefined} />
          <button className="login-password-toggle" type="button" onClick={() => setShowPassword(current => !current)} aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={showPassword} aria-controls="login-password">{showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}</button>
        </div>
      </div>
      <LoginSubmit />
      <p className="login-help">หากเข้าใช้งานไม่ได้ กรุณาติดต่อผู้ดูแลระบบ</p>
    </form>
  );
}

function LoginSubmit() {
  const { pending } = useFormStatus();
  return <button type="submit" className="login-submit" disabled={pending} aria-busy={pending}>{pending ? <><LoaderCircle className="login-pending-icon" size={19} aria-hidden="true" />กำลังเข้าสู่ระบบ…</> : <>เข้าสู่ระบบ<ArrowRight size={19} aria-hidden="true" /></>}</button>;
}
