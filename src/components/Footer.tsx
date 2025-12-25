import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-12 bg-card border-t border-border">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* 로고 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">영양갱</h3>
              <p className="text-sm text-muted-foreground">Yanggaeng</p>
            </div>
          </div>


          {/* 저작권 */}
          <p className="text-sm text-muted-foreground">
            © 2026 영양갱. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
