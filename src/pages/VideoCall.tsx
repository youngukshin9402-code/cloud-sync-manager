import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  User,
  Clock,
  MessageSquare,
  Settings,
  Loader2,
} from "lucide-react";

interface Session {
  id: string;
  coach_id: string;
  user_id: string;
  scheduled_at: string;
  status: string;
  video_room_id: string | null;
  coach_notes: string | null;
}

export default function VideoCall() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // 세션 정보 가져오기
  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        navigate("/coaching");
        return;
      }

      const { data, error } = await supabase
        .from("coaching_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error || !data) {
        toast({
          title: "세션을 찾을 수 없습니다",
          description: "올바른 코칭 세션이 아닙니다.",
          variant: "destructive",
        });
        navigate("/coaching");
        return;
      }

      // 권한 확인
      if (data.user_id !== user?.id && data.coach_id !== user?.id) {
        toast({
          title: "접근 권한 없음",
          description: "이 코칭 세션에 참여할 수 없습니다.",
          variant: "destructive",
        });
        navigate("/coaching");
        return;
      }

      setSession(data);
      setLoading(false);
    };

    fetchSession();
  }, [sessionId, user, navigate, toast]);

  // 통화 시간 카운터
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleConnect = async () => {
    setIsConnecting(true);

    // 세션 상태 업데이트
    await supabase
      .from("coaching_sessions")
      .update({ status: "in_progress" })
      .eq("id", sessionId);

    // 실제 환경에서는 여기서 Agora/Twilio 등의 영상통화 SDK 연결
    // 현재는 시뮬레이션
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      toast({
        title: "연결되었습니다",
        description: "코칭 세션이 시작되었습니다.",
      });
    }, 2000);
  };

  const handleEndCall = async () => {
    // 세션 상태 업데이트
    await supabase
      .from("coaching_sessions")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    toast({
      title: "코칭 완료",
      description: "코칭 세션이 종료되었습니다.",
    });

    navigate("/coaching");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Main Video Area */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isConnected ? (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            {/* 상대방 비디오 영역 (시뮬레이션) */}
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center mx-auto mb-4">
                <User className="h-16 w-16 text-white" />
              </div>
              <p className="text-white text-xl font-semibold">
                {profile?.user_type === "coach" ? "회원" : "코치"}
              </p>
              <p className="text-white/60 text-sm mt-1">연결됨</p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
              <Video className="h-12 w-12 text-white/60" />
            </div>
            <h1 className="text-white text-2xl font-bold mb-2">코칭 세션</h1>
            <p className="text-white/60 mb-8">
              {profile?.user_type === "coach"
                ? "회원과 연결 준비가 완료되었습니다"
                : "코치와 연결 준비가 완료되었습니다"}
            </p>
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700 h-14 px-8"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  연결 중...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-5 w-5" />
                  통화 시작
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Self Video (Picture-in-Picture) */}
      {isConnected && (
        <div className="absolute top-4 right-4 w-32 h-44 bg-gray-700 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg">
          {isVideoOff ? (
            <div className="w-full h-full flex items-center justify-center">
              <VideoOff className="h-8 w-8 text-white/40" />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <User className="h-10 w-10 text-white/60" />
            </div>
          )}
        </div>
      )}

      {/* Top Bar */}
      {isConnected && (
        <div className="absolute top-4 left-4 flex items-center gap-3">
          <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <Clock className="h-4 w-4 text-white" />
            <span className="text-white font-mono">{formatDuration(callDuration)}</span>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      {isConnected && (
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <Card className="bg-black/50 backdrop-blur-md border-white/10">
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-4">
                {/* Mute Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-14 h-14 rounded-full ${
                    isMuted
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? (
                    <MicOff className="h-6 w-6" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </Button>

                {/* Video Toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={`w-14 h-14 rounded-full ${
                    isVideoOff
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                  onClick={() => setIsVideoOff(!isVideoOff)}
                >
                  {isVideoOff ? (
                    <VideoOff className="h-6 w-6" />
                  ) : (
                    <Video className="h-6 w-6" />
                  )}
                </Button>

                {/* End Call */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => setShowEndDialog(true)}
                >
                  <PhoneOff className="h-7 w-7" />
                </Button>

                {/* Chat */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <MessageSquare className="h-6 w-6" />
                </Button>

                {/* Settings */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white"
                >
                  <Settings className="h-6 w-6" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* End Call Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>통화 종료</DialogTitle>
            <DialogDescription>
              코칭 세션을 종료하시겠습니까?
              <br />
              통화 시간: {formatDuration(callDuration)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowEndDialog(false)}>
              계속하기
            </Button>
            <Button variant="destructive" onClick={handleEndCall}>
              <PhoneOff className="mr-2 h-4 w-4" />
              종료하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
