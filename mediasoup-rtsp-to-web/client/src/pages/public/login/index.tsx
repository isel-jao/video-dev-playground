import { useNavigate } from "react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const navigate = useNavigate();
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate("/");
  }

  return (
    <main className="container flex items-center justify-center">
      <form
        className="flex flex-col rounded-lg border bg-card p-6"
        onSubmit={handleSubmit}
      >
        <h1 className="text-center text-xl">LOGO</h1>
        <Label htmlFor="email" className="mt-4">
          email
        </Label>
        <Input id="email" type="email" className="mt-2" />
        <Label htmlFor="password" className="mt-4 inline-block">
          password
        </Label>
        <Input id="password" type="password" className="mt-2" />
        <Button className="mt-4">submit</Button>
      </form>
    </main>
  );
}
