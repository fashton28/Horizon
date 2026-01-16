"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  Video,
  Users,
  Brain,
  Briefcase,
  Code,
  Plus,
  Search,
  Settings,
  LayoutDashboard,
  Sparkles,
  ChevronDown,
  X,
  Loader2,
  LogOut,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Target,
} from "lucide-react";

// Interview types
const interviewTypes = [
  { id: "technical", name: "Technical", icon: Code },
  { id: "behavioral", name: "Behavioral", icon: Users },
  { id: "system_design", name: "System Design", icon: Brain },
  { id: "product", name: "Product", icon: Briefcase },
  { id: "general", name: "General", icon: Mic },
];

// Languages
const languages = [
  { id: "en", name: "English", flag: "🇺🇸" },
  { id: "es", name: "Spanish", flag: "🇪🇸" },
  { id: "bilingual", name: "Bilingual", flag: "🌎" },
];

// Voices
const voices = [
  { id: "Puck", name: "Puck", description: "Upbeat, energetic" },
  { id: "Charon", name: "Charon", description: "Calm, informative" },
  { id: "Kore", name: "Kore", description: "Warm, friendly" },
  { id: "Fenrir", name: "Fenrir", description: "Strong, confident" },
  { id: "Aoede", name: "Aoede", description: "Soft, bright" },
  { id: "Leda", name: "Leda", description: "Clear, neutral" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending: isSessionLoading } = authClient.useSession();
  const [commandOpen, setCommandOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("general");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [selectedVoice, setSelectedVoice] = useState("Puck");
  const [sessionName, setSessionName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"sessions" | "resume">("sessions");

  const user = session?.user;
  const userId = user?.id || "";
  const userName = user?.name || "User";
  const userEmail = user?.email || "";
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/auth/login");
  };

  // CMD+K handler
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const createMeeting = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/meeting/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewType: selectedType,
          language: selectedLanguage,
          voice: selectedVoice,
          name: sessionName.trim() || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to create meeting");
      return response.json();
    },
    onSuccess: (data) => {
      setModalOpen(false);
      setSessionName("");
      router.push(`/meeting/${data.callId}?type=${selectedType}&lang=${selectedLanguage}`);
    },
  });

  const handleQuickStart = useCallback((type: string) => {
    setSelectedType(type);
    setModalOpen(true);
    setCommandOpen(false);
  }, []);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterType("all");
  };

  const hasFilters = searchQuery || filterStatus !== "all" || filterType !== "all";

  // Fetch sessions from database
  const { data: sessionsData, isLoading: isSessionsLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const response = await fetch("/api/sessions");
      if (!response.ok) throw new Error("Failed to fetch sessions");
      return response.json();
    },
    enabled: !!session?.user,
  });

  // Helper function to format date
  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  };

  // Helper function to format duration
  const formatDuration = (ms: number | null) => {
    if (!ms) return "N/A";
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return "< 1 min";
    return `${minutes} min`;
  };

  // Transform and filter sessions
  const recentSessions = (sessionsData?.sessions || []).map((s: {
    id: string;
    name: string | null;
    interviewType: string;
    status: string;
    startedAt: string;
    durationMs: number | null;
  }) => ({
    id: s.id,
    name: s.name,
    type: s.interviewType,
    status: s.status,
    date: formatDate(s.startedAt),
    duration: formatDuration(s.durationMs),
  }));

  // Filter sessions
  const filteredSessions = recentSessions.filter((session: { type: string; status: string }) => {
    if (filterStatus !== "all" && session.status !== filterStatus) return false;
    if (filterType !== "all" && session.type !== filterType) return false;
    if (searchQuery && !session.type.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (isSessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Command Palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => { setModalOpen(true); setCommandOpen(false); }}>
              <Plus className="mr-2 h-4 w-4" />
              New Practice Session
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Interview Types">
            {interviewTypes.map((type) => (
              <CommandItem key={type.id} onSelect={() => handleQuickStart(type.id)}>
                <type.icon className="mr-2 h-4 w-4" />
                {type.name} Interview
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Navigation">
            <CommandItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Meeting Setup Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-sm p-0 gap-0">
          <VisuallyHidden.Root>
            <DialogTitle>New Practice Session</DialogTitle>
            <DialogDescription>Configure your interview practice session settings</DialogDescription>
          </VisuallyHidden.Root>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="font-medium">New Session</h2>
            <button
              onClick={() => setModalOpen(false)}
              className="h-6 w-6 rounded-sm hover:bg-muted flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Session Name */}
          <div className="px-4 py-3 border-b">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Session Name (optional)
            </label>
            <Input
              placeholder="e.g., Google PM Interview Prep"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Selected Tags */}
          <div className="px-4 py-3 border-b flex flex-wrap gap-2">
            {/* Selected Type */}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-foreground text-background text-xs font-medium">
              {interviewTypes.find(t => t.id === selectedType)?.name}
              <button
                onClick={() => setSelectedType("general")}
                className="hover:bg-white/20 rounded-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
            {/* Selected Language */}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-foreground text-background text-xs font-medium">
              {languages.find(l => l.id === selectedLanguage)?.flag} {languages.find(l => l.id === selectedLanguage)?.name}
              <button
                onClick={() => setSelectedLanguage("en")}
                className="hover:bg-white/20 rounded-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
            {/* Selected Voice */}
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-foreground text-background text-xs font-medium">
              {voices.find(v => v.id === selectedVoice)?.name}
              <button
                onClick={() => setSelectedVoice("Puck")}
                className="hover:bg-white/20 rounded-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto">
            {/* Interview Types Section */}
            <div className="px-4 py-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Interview Type</p>
              <div className="space-y-1">
                {interviewTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                      selectedType === type.id
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    }`}>
                      {selectedType === type.id && (
                        <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <type.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1 text-left">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Languages Section */}
            <div className="px-4 py-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">Language</p>
              <div className="space-y-1">
                {languages.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setSelectedLanguage(lang.id)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                      selectedLanguage === lang.id
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    }`}>
                      {selectedLanguage === lang.id && (
                        <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-base">{lang.flag}</span>
                    <span className="text-sm flex-1 text-left">{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Voices Section */}
            <div className="px-4 py-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">Voice</p>
              <div className="space-y-1">
                {voices.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                      selectedVoice === voice.id
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    }`}>
                      {selectedVoice === voice.id && (
                        <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm flex-1 text-left">{voice.name}</span>
                    <span className="text-xs text-muted-foreground">{voice.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t">
            <Button
              className="w-full"
              onClick={() => createMeeting.mutate()}
              disabled={createMeeting.isPending}
            >
              {createMeeting.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Video className="mr-2 h-4 w-4" />
                  Start Session
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sidebar */}
      <aside className="w-56 bg-sidebar text-sidebar-foreground flex flex-col">
        {/* Logo */}
        <div className="p-4">
          <span className="text-2xl" style={{ fontFamily: "var(--font-playfair)" }}>
            <span className="italic">Hori</span>
            <span className="font-bold italic">zon</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2">
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab("sessions")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                activeTab === "sessions"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-sm font-medium">Sessions</span>
            </button>
            <button
              onClick={() => setActiveTab("resume")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                activeTab === "resume"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Resume Optimizer</span>
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">Settings</span>
            </button>
          </div>
        </nav>

        {/* Usage Card */}
        <div className="px-3 pb-3">
          <div className="p-4 rounded-lg bg-sidebar-accent">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Free Trial</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-sidebar-muted">Sessions</span>
                  <span>3/10</span>
                </div>
                <div className="h-1.5 bg-sidebar-border rounded-full overflow-hidden">
                  <div className="h-full w-[30%] bg-primary rounded-full" />
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" className="w-full mt-3 border-sidebar-border text-sidebar-foreground hover:bg-sidebar-border">
              Upgrade
            </Button>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 p-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
              {userInitials || "U"}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-sidebar-muted truncate">{userEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              className="h-8 w-8 rounded-lg hover:bg-sidebar-accent flex items-center justify-center transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4 text-sidebar-muted" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b bg-card flex items-center px-4 gap-4">
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/50 hover:bg-muted transition-colors text-sm text-muted-foreground w-64"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-background px-1.5 font-mono text-xs">
              ⌘K
            </kbd>
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "sessions" && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">My Sessions</h1>
                <Button onClick={() => setModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Meeting
                </Button>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sessions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-48"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {interviewTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                    <X className="mr-1 h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Sessions Grid */}
              {isSessionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredSessions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Video className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-1">No sessions found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {hasFilters ? "Try adjusting your filters" : "Start your first practice session"}
                    </p>
                    {!hasFilters && (
                      <Button onClick={() => setModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Meeting
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredSessions.map((session: { id: string; name: string | null; type: string; status: string; date: string; duration: string }) => {
                    const typeInfo = interviewTypes.find((t) => t.id === session.type);
                    const statusStyles = session.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700";
                    return (
                      <Card
                        key={session.id}
                        className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-sm"
                        onClick={() => router.push(`/session/${session.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              {typeInfo && <typeInfo.icon className="h-5 w-5 text-primary" />}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full capitalize ${statusStyles}`}>
                              {session.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="font-medium">
                            {session.name || <span className="capitalize">{session.type.replace("_", " ")} Interview</span>}
                          </p>
                          {session.name && (
                            <p className="text-xs text-muted-foreground capitalize">{session.type.replace("_", " ")}</p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            {session.date} · {session.duration}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === "resume" && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-semibold">Resume Optimizer</h1>
                  <p className="text-muted-foreground text-sm mt-1">AI-powered resume analysis and optimization</p>
                </div>
              </div>

              {/* Upload Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">Upload your resume</h3>
                      <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                        Drag and drop your resume file here, or click to browse. We support PDF and DOCX formats.
                      </p>
                      <Button>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose File
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Mock Analysis Preview */}
                  <Card className="mt-6">
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4">What you&apos;ll get</h3>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">ATS Compatibility Score</p>
                            <p className="text-sm text-muted-foreground">See how well your resume performs with applicant tracking systems</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Target className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Keyword Optimization</p>
                            <p className="text-sm text-muted-foreground">Get suggestions for industry-specific keywords to include</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Improvement Suggestions</p>
                            <p className="text-sm text-muted-foreground">Receive actionable feedback to strengthen your resume</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-3">How it works</h3>
                      <ol className="space-y-3 text-sm">
                        <li className="flex items-start gap-3">
                          <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium flex-shrink-0">1</span>
                          <span className="text-muted-foreground">Upload your current resume</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium flex-shrink-0">2</span>
                          <span className="text-muted-foreground">Our AI analyzes content, format, and keywords</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium flex-shrink-0">3</span>
                          <span className="text-muted-foreground">Get detailed feedback and suggestions</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium flex-shrink-0">4</span>
                          <span className="text-muted-foreground">Download your optimized resume</span>
                        </li>
                      </ol>
                    </CardContent>
                  </Card>

                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">Pro Tip</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        For best results, include a job description you&apos;re targeting. Our AI will tailor suggestions specifically for that role.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
