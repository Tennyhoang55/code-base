import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { Loading } from "@/components/shared/loading";
import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/actions";
import { EndParticipantSession } from "@/features/auth/components/end-participant-session";
import { Navigation } from "@/features/auth/components/navigation";
import { SessionActivity } from "@/features/auth/components/session-activity";
import { requireUser } from "@/features/auth/session";
import { getNavigationSettings } from "@/features/training/queries";

async function Shell({ children }: { children: ReactNode }) {
  const user = await requireUser(true);
  const settings = await getNavigationSettings();
  return (
    <>
      <SessionActivity participant={user.identityType === "PARTICIPANT"} />
      <div className="nav-band">
        <div className="wrap">
          <div className="user-row">
            <div>
              <strong>{user.name}</strong>
              <span>
                {user.department ? `${user.department} · ` : ""}
                {user.branch.name}
                {user.role === "ADMIN" ? " · Quản trị" : ""}
              </span>
            </div>
            <div className="row">
              <Link href="/tai-khoan" className="account-link">
                {user.identityType === "PARTICIPANT"
                  ? "Thông tin của tôi"
                  : "Tài khoản"}
              </Link>
              {user.identityType === "PARTICIPANT" ? (
                <EndParticipantSession />
              ) : (
                <form action={logout}>
                  <Button type="submit" variant="ghost" className="logout">
                    Đăng xuất
                  </Button>
                </form>
              )}
            </div>
          </div>
          <Navigation
            admin={user.role === "ADMIN"}
            board={settings.allowLeaderboard}
            restricted={user.mustChangePassword}
          />
        </div>
      </div>
      {children}
    </>
  );
}
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
