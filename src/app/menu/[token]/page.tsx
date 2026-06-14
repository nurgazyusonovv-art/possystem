import { MenuClient } from "./MenuClient";

export default async function MenuPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <MenuClient token={token} />;
}
