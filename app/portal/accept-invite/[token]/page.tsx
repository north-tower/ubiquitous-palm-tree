import { AcceptPortalInviteForm } from "./accept-invite-form";

export default async function AcceptPortalInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <AcceptPortalInviteForm token={token} />;
}
