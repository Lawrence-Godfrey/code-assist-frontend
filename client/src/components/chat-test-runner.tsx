import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/chat-interface";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Play, Square, RotateCcw } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Example test script format
type TestScript = {
  name: string;
  description: string;
  messages: { role: string; content: string }[];
  responses: { role: string; content: string; approvalNeeded?: boolean }[];
};

// Sample test scripts
const sampleTestScripts: TestScript[] = [
  {
    name: "Basic Requirement Gathering",
    description: "Simulates a user providing requirements and the agent requesting approval",
    messages: [
      { role: "user", content: "I need an app that helps me track my expenses" },
      { role: "user", content: "It should have categories and let me add receipts" },
      { role: "user", content: "I also want monthly reports" },
    ],
    responses: [
      { role: "agent", content: "Thank you for sharing your requirements. An expense tracking app with categories sounds useful. What kind of categories are you thinking of?" },
      { role: "agent", content: "Great! Being able to add receipts will be helpful for record-keeping. Would you like to be able to scan receipts or just upload images?" },
      { role: "agent", content: "Monthly reports are a good feature for tracking spending trends. Based on our conversation, I understand you want an expense tracking app with:\n\n1. Category-based expense tracking\n2. Receipt upload functionality\n3. Monthly spending reports\n\nIs there anything else you'd like to add to these requirements? [APPROVAL_NEEDED]", approvalNeeded: true },
    ],
  },
  {
    name: "Technical Spec Discussion",
    description: "Simulates a technical specification discussion with approval request",
    messages: [
      { role: "user", content: "What database would you recommend for this app?" },
      { role: "user", content: "I like the idea of SQLite for mobile, but what about the web version?" },
      { role: "user", content: "That makes sense. Let's go with PostgreSQL for the web version." },
    ],
    responses: [
      { role: "agent", content: "For an expense tracking app, you have several good database options. If this is primarily a mobile app, SQLite would be efficient as it's embedded within the app and doesn't require a separate server. If you're building a web app with multiple users, PostgreSQL would provide better scalability and concurrent access. What platform are you primarily targeting?" },
      { role: "agent", content: "That's a good approach. SQLite works well for the mobile version as it's lightweight and doesn't require a connection. For the web version, PostgreSQL would indeed be better as it handles concurrent users well and offers advanced features for reporting. It also has excellent JSON support if you need flexible schema for categories or receipt metadata." },
      { role: "agent", content: "I'll document our technical decisions:\n\n1. Mobile app: SQLite database (embedded, efficient for mobile use)\n2. Web app: PostgreSQL database (scalable, good for concurrent users, strong reporting capabilities)\n\nThis approach gives you the best of both worlds - efficient mobile performance and robust web capabilities. Is this technical direction acceptable? [APPROVAL_NEEDED]", approvalNeeded: true },
    ],
  }
];

// Component to edit test scripts
function TestScriptEditor({ 
  script, 
  onSave 
}: { 
  script: TestScript; 
  onSave: (script: TestScript) => void 
}) {
  const [editedScript, setEditedScript] = useState<TestScript>(script);
  const [editMode, setEditMode] = useState(false);

  if (!editMode) {
    return (
      <div className="mt-4 p-4 border rounded-md">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium">{script.name}</h3>
          <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
            Edit Script
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-2">{script.description}</p>
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Conversation:</h4>
          {script.messages.map((msg, idx) => (
            <div key={idx} className="text-xs pl-2 border-l-2 border-primary/50">
              <span className="font-medium">{msg.role}:</span> {msg.content.length > 100 ? msg.content.substring(0, 100) + "..." : msg.content}
              {script.responses[idx]?.approvalNeeded && <span className="text-xs ml-2 bg-yellow-100 p-1 rounded">Approval Needed</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 border rounded-md">
      <div className="space-y-4">
        <div>
          <Label htmlFor="scriptName">Script Name</Label>
          <input
            id="scriptName"
            className="w-full px-3 py-1 border rounded-md"
            value={editedScript.name}
            onChange={(e) => setEditedScript({ ...editedScript, name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="scriptDescription">Description</Label>
          <Textarea
            id="scriptDescription"
            value={editedScript.description}
            onChange={(e) => setEditedScript({ ...editedScript, description: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Conversation:</h4>
          {editedScript.messages.map((msg, idx) => (
            <div key={idx} className="flex flex-col space-y-2 p-2 border rounded-md">
              <div className="flex items-center space-x-2">
                <Label>User Message:</Label>
                <Textarea
                  value={msg.content}
                  onChange={(e) => {
                    const newMessages = [...editedScript.messages];
                    newMessages[idx] = { ...msg, content: e.target.value };
                    setEditedScript({ ...editedScript, messages: newMessages });
                  }}
                />
              </div>
              {editedScript.responses[idx] && (
                <div className="flex flex-col space-y-2">
                  <Label>Agent Response:</Label>
                  <Textarea
                    value={editedScript.responses[idx].content}
                    onChange={(e) => {
                      const newResponses = [...editedScript.responses];
                      newResponses[idx] = { ...newResponses[idx], content: e.target.value };
                      setEditedScript({ ...editedScript, responses: newResponses });
                    }}
                  />
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`approvalNeeded-${idx}`}
                      checked={!!editedScript.responses[idx].approvalNeeded}
                      onCheckedChange={(checked) => {
                        const newResponses = [...editedScript.responses];
                        newResponses[idx] = { ...newResponses[idx], approvalNeeded: checked };
                        setEditedScript({ ...editedScript, responses: newResponses });
                      }}
                    />
                    <Label htmlFor={`approvalNeeded-${idx}`}>Approval Needed</Label>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setEditMode(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(editedScript);
              setEditMode(false);
            }}
          >
            Save Script
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ChatTestRunner() {
  const [selectedScript, setSelectedScript] = useState<TestScript>(sampleTestScripts[0]);
  const [scripts, setScripts] = useState<TestScript[]>(sampleTestScripts);
  const [isRunning, setIsRunning] = useState(false);
  const [showRealTimeView, setShowRealTimeView] = useState(true);
  const [testStageId] = useState(999); // Use a fake stage ID for testing

  // Add a new test script
  const addScript = () => {
    const newScript: TestScript = {
      name: "New Test Script",
      description: "Add your description here",
      messages: [{ role: "user", content: "Sample user message" }],
      responses: [{ role: "agent", content: "Sample agent response" }],
    };
    
    setScripts([...scripts, newScript]);
    setSelectedScript(newScript);
  };

  // Update an existing test script
  const updateScript = (updatedScript: TestScript) => {
    const newScripts = scripts.map((script) =>
      script.name === selectedScript.name ? updatedScript : script
    );
    setScripts(newScripts);
    setSelectedScript(updatedScript);
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Chat Interface Test Runner</CardTitle>
          <CardDescription>
            Run automated tests on your chat interface with predefined scripts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Test Scripts</h2>
                <Button onClick={addScript}>Add Script</Button>
              </div>
              
              <div className="mb-4">
                <Label htmlFor="scriptSelect">Select Script</Label>
                <select
                  id="scriptSelect"
                  className="w-full px-3 py-2 border rounded-md"
                  value={selectedScript.name}
                  onChange={(e) => {
                    const selected = scripts.find(s => s.name === e.target.value);
                    if (selected) setSelectedScript(selected);
                  }}
                >
                  {scripts.map((script) => (
                    <option key={script.name} value={script.name}>
                      {script.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <TestScriptEditor script={selectedScript} onSave={updateScript} />
              
              <div className="mt-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="showRealTimeView"
                    checked={showRealTimeView}
                    onCheckedChange={setShowRealTimeView}
                  />
                  <Label htmlFor="showRealTimeView">Show Real-Time View</Label>
                </div>
                
                <div className="flex space-x-4">
                  <Button
                    variant={isRunning ? "destructive" : "default"}
                    onClick={() => setIsRunning(!isRunning)}
                    className="flex-1"
                  >
                    {isRunning ? (
                      <>
                        <Square className="h-4 w-4 mr-2" /> Stop Test
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" /> Run Test
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setIsRunning(false);
                      // Force rerender by toggling state
                      setShowRealTimeView(false);
                      setTimeout(() => setShowRealTimeView(true), 50);
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" /> Reset
                  </Button>
                </div>
              </div>
            </div>
            
            {showRealTimeView && (
              <div className="border rounded-md overflow-hidden h-[600px]">
                <h2 className="text-lg font-bold p-4 border-b">Real-Time Chat View</h2>
                <div className="h-full">
                  <ChatInterface
                    stageId={testStageId}
                    stageName="Test Stage"
                    isPendingChat={false}
                    testConfig={{
                      autoTest: isRunning,
                      testMessages: selectedScript.messages,
                      testResponses: selectedScript.responses,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}