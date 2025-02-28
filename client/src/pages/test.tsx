import { ChatTestRunner } from "@/components/chat-test-runner";

export default function TestPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full bg-background border-b">
        <div className="container mx-auto py-4">
          <h1 className="text-2xl font-bold">Chat Interface Automated Testing</h1>
        </div>
      </header>

      <main className="container mx-auto py-6">
        <ChatTestRunner />
      </main>

      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        <div className="container mx-auto">
          <p>Use the test runner to automate your chat interface testing</p>
        </div>
      </footer>
    </div>
  );
}