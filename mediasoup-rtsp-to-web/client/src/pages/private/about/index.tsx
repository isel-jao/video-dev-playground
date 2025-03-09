import { useEffect } from "react";

export default function AboutPage() {
  useEffect(() => {
    console.log("AboutPage");
  }, []);
  return <main className="container">AboutPage</main>;
}
