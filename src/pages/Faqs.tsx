import { useState } from 'react';
import Layout from '../components/Layout';

const faqs = [
  { q: 'What is StudentConnect?', a: 'StudentConnect is a networking platform for students at KJSIT to collaborate, share ideas, and build professional connections.' },
  { q: 'How do I create an account?', a: 'Click "Sign Up" on the landing page and fill in your details. You can then create your profile with your interests and skills.' },
  { q: 'Can I write blog posts?', a: 'Yes! Navigate to the "Write Blog" section to create and publish blog posts. Your blogs will be visible to all students.' },
  { q: 'How do I search for other students?', a: 'Use the Search page to find students by name, major, or interests. You can also use the Advanced Filter for more specific searches.' },
  { q: 'Is my data secure?', a: 'Currently, data is stored locally in your browser. We prioritize user privacy and do not share personal information.' },
  { q: 'Can I edit or delete my posts?', a: 'Yes, you can edit your blog posts. Navigate to the blog and click the Edit button to make changes.' },
  { q: 'How do I contact support?', a: 'You can reach out through the About Us page or contact the development team directly via the links provided.' },
  { q: 'Is StudentConnect available on mobile?', a: 'Yes! StudentConnect is fully responsive and works on all devices — phones, tablets, and desktops.' },
];

export default function FaqsPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h1>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="glass-card overflow-hidden">
              <button
                className="w-full p-5 text-left flex justify-between items-center font-semibold text-sm"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span>{faq.q}</span>
                <i className={`fas fa-chevron-down transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-sm opacity-70 animate-fade-in">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
