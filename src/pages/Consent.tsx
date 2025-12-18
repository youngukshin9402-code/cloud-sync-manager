import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useUserConsent } from '@/hooks/useUserConsent';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  FileText, 
  Heart, 
  Mail,
  ChevronRight,
  AlertTriangle,
  Loader2 
} from 'lucide-react';

interface ConsentItem {
  key: 'terms' | 'privacy' | 'health' | 'marketing';
  title: string;
  required: boolean;
  icon: React.ReactNode;
  description: string;
  link?: string;
}

const consentItems: ConsentItem[] = [
  {
    key: 'terms',
    title: '이용약관 동의',
    required: true,
    icon: <FileText className="w-5 h-5" />,
    description: '영양갱 서비스 이용에 필요한 약관입니다.',
    link: '/terms',
  },
  {
    key: 'privacy',
    title: '개인정보 처리방침 동의',
    required: true,
    icon: <Shield className="w-5 h-5" />,
    description: '개인정보 수집 및 이용에 관한 사항입니다.',
    link: '/privacy',
  },
  {
    key: 'health',
    title: '건강정보 처리 고지 동의',
    required: true,
    icon: <Heart className="w-5 h-5" />,
    description: '건강검진 결과, 식단, 운동 등 민감정보 처리에 관한 사항입니다.',
    link: '/health-privacy',
  },
  {
    key: 'marketing',
    title: '마케팅 정보 수신 동의',
    required: false,
    icon: <Mail className="w-5 h-5" />,
    description: '이벤트, 혜택 등 마케팅 정보를 받아보실 수 있습니다.',
  },
];

export default function Consent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { saveConsent } = useUserConsent();
  const [loading, setLoading] = useState(false);
  const [consents, setConsents] = useState({
    terms: false,
    privacy: false,
    health: false,
    marketing: false,
  });

  const allRequiredChecked = consents.terms && consents.privacy && consents.health;
  const allChecked = allRequiredChecked && consents.marketing;

  const handleToggleAll = () => {
    const newValue = !allChecked;
    setConsents({
      terms: newValue,
      privacy: newValue,
      health: newValue,
      marketing: newValue,
    });
  };

  const handleToggle = (key: keyof typeof consents) => {
    setConsents(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!allRequiredChecked) {
      toast({
        title: '필수 항목에 동의해주세요',
        description: '서비스 이용을 위해 필수 약관에 동의가 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await saveConsent({
      terms_agreed: consents.terms,
      privacy_agreed: consents.privacy,
      health_info_agreed: consents.health,
      marketing_agreed: consents.marketing,
    });

    if (error) {
      toast({
        title: '동의 저장 실패',
        description: '잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    toast({
      title: '동의가 완료되었습니다',
      description: '영양갱 서비스를 시작합니다!',
    });
    
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">서비스 이용 동의</h1>
        <p className="text-muted-foreground mt-2">
          영양갱 서비스 이용을 위해 아래 약관에 동의해주세요.
        </p>
      </div>

      {/* Beta Notice */}
      <div className="mx-4 mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800">베타 테스트 안내</p>
          <p className="text-sm text-amber-700 mt-1">
            현재 베타 테스트 기간입니다. 일부 기능이 제한되거나 변경될 수 있습니다.
          </p>
        </div>
      </div>

      {/* Consent Items */}
      <div className="flex-1 px-4 space-y-3">
        {/* Select All */}
        <div 
          className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 cursor-pointer"
          onClick={handleToggleAll}
        >
          <Checkbox 
            checked={allChecked} 
            onCheckedChange={handleToggleAll}
            className="w-6 h-6"
          />
          <span className="font-semibold text-lg">전체 동의</span>
        </div>

        <div className="h-px bg-border my-4" />

        {/* Individual Items */}
        {consentItems.map(item => (
          <div 
            key={item.key}
            className="bg-card rounded-xl border border-border p-4 space-y-2"
          >
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => handleToggle(item.key)}
            >
              <Checkbox 
                checked={consents[item.key]} 
                onCheckedChange={() => handleToggle(item.key)}
                className="w-5 h-5"
              />
              <div className="flex-1 flex items-center gap-2">
                <span className={item.required ? 'text-primary' : 'text-muted-foreground'}>
                  {item.icon}
                </span>
                <span className="font-medium">
                  {item.title}
                  {item.required && <span className="text-destructive ml-1">(필수)</span>}
                </span>
              </div>
              {item.link && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(item.link!);
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground pl-8">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="p-4 pb-8 bg-background border-t border-border">
        <Button 
          className="w-full h-14 text-lg font-semibold"
          disabled={!allRequiredChecked || loading}
          onClick={handleSubmit}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              처리 중...
            </>
          ) : (
            '동의하고 시작하기'
          )}
        </Button>
        {!allRequiredChecked && (
          <p className="text-center text-sm text-muted-foreground mt-3">
            필수 항목에 모두 동의해야 서비스를 이용할 수 있습니다.
          </p>
        )}
      </div>
    </div>
  );
}
