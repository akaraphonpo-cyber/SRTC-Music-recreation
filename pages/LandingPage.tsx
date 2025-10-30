import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SRTC_LOGO_URL } from '../constants';

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="glass-card p-8 text-center flex flex-col items-center hover:-translate-y-2 transition-transform duration-300 h-full">
    <div className="bg-white/10 text-white rounded-full p-4 mb-5">
      {icon}
    </div>
    <h3 className="text-xl font-semibold text-shadow mb-3" style={{color: 'var(--text-primary)'}}>{title}</h3>
    <p className="text-sm leading-relaxed text-shadow" style={{color: 'var(--text-secondary)'}}>{description}</p>
  </div>
);

const LandingPage: React.FC = () => {
  useEffect(() => {
    // The Facebook SDK script might run before React renders the component.
    // We need to explicitly tell the SDK to re-parse the page for plugins
    // after this component has mounted.
    if ((window as any).FB) {
      (window as any).FB.XFBML.parse();
    }
  }, []);

  return (
    <div className="w-full">
      <div className="relative overflow-hidden">
        {/* Hero Section */}
        <section className="relative min-h-[70vh] flex items-center justify-center text-center py-20 px-4">
          <div className="z-10 flex flex-col items-center">
            <div className="glass-card p-8 md:p-12 max-w-4xl rounded-3xl">
              <img src={SRTC_LOGO_URL} alt="SRTC Logo" className="h-24 w-24 object-contain mx-auto mb-6 bg-white/20 rounded-full p-2" />
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-shadow mb-4 tracking-tight" style={{color: 'var(--text-primary)'}}>
                SRTC Music & Recreation
              </h1>
              <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 text-shadow" style={{color: 'var(--text-secondary)'}}>
                ปลดปล่อยความคิดสร้างสรรค์และพลังในตัวคุณ เข้าร่วมกิจกรรมดนตรี กีฬา และนันทนาการที่หลากหลาย เพื่อพัฒนาทักษะและสร้างมิตรภาพ
              </p>
              <Link
                to="/register"
                className="inline-block btn-accent font-bold py-4 px-10 rounded-full text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                ลงทะเบียน
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="relative py-20 px-4">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center text-shadow mb-12" style={{color: 'var(--text-primary)'}}>เข้าร่วมกับเรา</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <FeatureCard
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 6l12-3" />
                </svg>}
                title="ชมรมดนตรีและนันทนาการ"
                description="เข้าร่วมวงดนตรี, การแสดง,หรือกิจกรรมต่างๆ เพื่อฝึกฝนและแสดงความสามารถของคุณ"
              />
              <FeatureCard
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>}
                title="กีฬาอิเล็กทรอนิกส์(Esport)"
                description="การแข่งขันกีฬาอิเล็กทรอนิกส์(Esport)นี่คือเวทีที่จะเปิดโอกาสให้คุณได้ แสดงศักยภาพ ทักษะ และความสามารถเชิงกลยุทธ์ บนสนามแข่งขันอย่างเป็นทางการ"
              />
              <FeatureCard
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.084-1.28-.24-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.084-1.28.24-1.857m11.52 1.857A3 3 0 0014.143 18H9.857a3 3 0 00-2.757 1.857M12 14a4 4 0 110-8 4 4 0 010 8z" />
                </svg>}
                title="สร้างมิตรภาพและทีมเวิร์ค"
                description="พบปะเพื่อนใหม่ที่มีความสนใจคล้ายกัน เรียนรู้การทำงานเป็นทีม และสร้างความทรงจำดีๆ ร่วมกัน"
              />
            </div>
          </div>
        </section>

        {/* Facebook Page Section */}
        <section className="relative py-20 px-4">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold text-shadow mb-12" style={{color: 'var(--text-primary)'}}>ติดตามเราบน Facebook</h2>
            <div className="max-w-lg mx-auto glass-card rounded-2xl p-2 md:p-4 overflow-hidden">
                <div className="fb-page" 
                    data-href="https://www.facebook.com/SRTCband/" 
                    data-tabs="timeline" 
                    data-width="500" 
                    data-height="500" 
                    data-small-header="false" 
                    data-adapt-container-width="true" 
                    data-hide-cover="false" 
                    data-show-facepile="true">
                    <blockquote 
                    cite="https://www.facebook.com/SRTCband/" 
                    className="fb-xfbml-parse-ignore">
                    <a href="https://www.facebook.com/SRTCband/">ชมรมดนตรีและนันทนาการ SRTC Music&amp;Recreation</a>
                    </blockquote>
                </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LandingPage;