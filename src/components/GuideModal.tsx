import React from 'react';
import { ExternalLink, X } from 'lucide-react';

interface GuideModalProps {
  onClose: () => void;
}

/**
 * Cửa sổ hướng dẫn sử dụng mô hình ./model/ có sẵn
 * hoặc tự huấn luyện mô hình âm thanh 5 lớp trên Google Teachable Machine.
 */
export const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/55 backdrop-blur-xs p-4"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 border border-emerald-200 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2
            id="guide-title"
            className="text-xl font-extrabold text-[#14281d]"
          >
            Hướng dẫn điều khiển AI Teachable Machine
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hướng dẫn"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ol className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <li>
            <strong className="text-emerald-900">
              1. Mô hình đã tích hợp sẵn trong thư mục ./model/
            </strong>
            <p className="mt-1">
              Trò chơi tự động đọc đủ 3 tệp{' '}
              <code className="font-mono-nums bg-slate-100 px-1.5 py-0.5 rounded">
                model.json
              </code>
              ,{' '}
              <code className="font-mono-nums bg-slate-100 px-1.5 py-0.5 rounded">
                metadata.json
              </code>{' '}
              và{' '}
              <code className="font-mono-nums bg-slate-100 px-1.5 py-0.5 rounded">
                model.weights.bin
              </code>{' '}
              với 5 lớp âm thanh chuẩn:
            </p>
            <ul className="mt-1.5 list-disc list-inside space-y-1 text-slate-600">
              <li>
                <strong>Lên</strong> &rarr; Di chuyển lên trên 1 ô
              </li>
              <li>
                <strong>Xuống</strong> &rarr; Di chuyển xuống dưới 1 ô
              </li>
              <li>
                <strong>Sang trái</strong> &rarr; Di chuyển sang trái 1 ô
              </li>
              <li>
                <strong>Sang phải</strong> &rarr; Di chuyển sang phải 1 ô
              </li>
              <li>
                <strong>Background Noise</strong> &rarr; Đứng yên, không điều
                khiển nhân vật
              </li>
            </ul>
          </li>

          <li>
            <strong className="text-emerald-900">
              2. Quy tắc nhận diện &amp; chống lặp
            </strong>
            <p className="mt-1">
              Micro chỉ bật khi bạn nhấn <strong>BẮT ĐẦU</strong> và cấp quyền
              microphone. Khi đọc khẩu lệnh đạt độ tin cậy{' '}
              <strong>&ge; 55%</strong>, Bé Lạc di chuyển đúng 1 ô và tạm khóa
              nhận lệnh trong lúc bay cũng như cho tới khi AI nhận diện{' '}
              <strong>Background Noise</strong> (hoặc khoảng lặng), tránh việc
              kéo dài giọng làm đi nhiều ô.
            </p>
          </li>

          <li>
            <strong className="text-emerald-900">
              3. Hoặc dùng URL Teachable Machine khác
            </strong>
            <p className="mt-1">
              Bạn cũng có thể dán liên kết mô hình trực tuyến (ví dụ:{' '}
              <code className="font-mono-nums text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                https://teachablemachine.withgoogle.com/models/h_tAjSKNG/
              </code>
              ) và nhấn <strong>Tải lại</strong>.
            </p>
            <a
              href="https://teachablemachine.withgoogle.com/train/audio"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 mt-1.5 font-semibold text-emerald-700 hover:underline"
            >
              <span>Mở Teachable Machine Audio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </li>
        </ol>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
