"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, Video, Users, Brain, Briefcase, Code } from "lucide-react";

const interviewTypes = [
  {
    id: "technical",
    name: "Technical Interview",
    description: "Algorithms, data structures, and coding concepts",
    icon: Code,
  },
  {
    id: "behavioral",
    name: "Behavioral Interview",
    description: "STAR method, past experiences, and soft skills",
    icon: Users,
  },
  {
    id: "system_design",
    name: "System Design",
    description: "Architecture, scalability, and trade-offs",
    icon: Brain,
  },
  {
    id: "product",
    name: "Product Interview",
    description: "Product thinking, estimation, and case studies",
    icon: Briefcase,
  },
  {
    id: "general",
    name: "General Interview",
    description: "Mix of technical and behavioral questions",
    icon: Mic,
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState("general");
  const [userId] = useState(() => `user-${Math.random().toString(36).substring(2, 9)}`);

  const createMeeting = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/meeting/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewType: selectedType,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create meeting");
      }

      return response.json();
    },
    onSuccess: (data) => {
      router.push(`/meeting/${data.callId}?type=${selectedType}&userId=${userId}`);
    },
  });

  const selectedInterview = interviewTypes.find((t) => t.id === selectedType);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              AI Interview Practice
            </h1>
            <p className="text-xl text-muted-foreground">
              Practice your interview skills with an AI-powered interviewer
            </p>
          </div>

          {/* Main Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Start a Practice Session
              </CardTitle>
              <CardDescription>
                Choose an interview type and begin practicing with our AI interviewer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Interview Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Interview Type</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select interview type" />
                  </SelectTrigger>
                  <SelectContent>
                    {interviewTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Type Description */}
              {selectedInterview && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <selectedInterview.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedInterview.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedInterview.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Start Button */}
              <Button
                size="lg"
                className="w-full"
                onClick={() => createMeeting.mutate()}
                disabled={createMeeting.isPending}
              >
                {createMeeting.isPending ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Creating Session...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    Start Practice Session
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Interview Types Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {interviewTypes.map((type) => (
              <Card
                key={type.id}
                className={`cursor-pointer transition-all hover:border-primary ${
                  selectedType === type.id ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => setSelectedType(type.id)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        selectedType === type.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <type.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{type.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {type.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tips Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Tips for Your Practice Session</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Mic className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Speak clearly and at a natural pace</span>
                </li>
                <li className="flex items-start gap-2">
                  <Video className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Ensure good lighting and a quiet environment</span>
                </li>
                <li className="flex items-start gap-2">
                  <Brain className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Take your time to think before answering</span>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Treat it like a real interview for best results</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
