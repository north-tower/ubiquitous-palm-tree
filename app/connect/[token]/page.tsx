import { ConnectScreen } from "@/components/connect-screen";

export default async function ConnectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ConnectScreen token={token} />;
}
