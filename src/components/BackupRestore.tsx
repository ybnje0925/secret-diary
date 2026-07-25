import React, { useRef } from "react";
import { Person, CustomGroup } from "../types";
import { Download, Upload, Trash2, ShieldAlert } from "lucide-react";

interface BackupRestoreProps {
  people: Person[];
  customGroups: CustomGroup[];
  onImport: (people: Person[], customGroups: CustomGroup[]) => void;
  onClearAll: () => void;
}

export default function BackupRestore({
  people,
  customGroups,
  onImport,
  onClearAll
}: BackupRestoreProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export current data as JSON file
  const handleExport = () => {
    const dataStr = JSON.stringify({
      version: "1.0",
      exportDate: new Date().toISOString(),
      people,
      customGroups
    }, null, 2);
    
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `용쨔의_비밀노트_백업_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import data from local JSON file
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.people && Array.isArray(json.people)) {
          onImport(json.people, json.customGroups || []);
          alert("🎉 성공적으로 백업 데이터를 가져왔습니다!");
        } else {
          alert("⚠️ 올바른 용쨔의 비밀노트 백업 파일이 아닙니다.");
        }
      } catch (err) {
        alert("⚠️ 파일을 분석하는 데 실패했습니다. 파일이 깨졌는지 확인해 주세요.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const confirmClearAll = () => {
    const doubleCheck = window.confirm(
      "⚠️ 정말로 모든 지인 데이터와 대화 기록을 지우시겠습니까?\n이 작업은 되돌릴 수 없습니다. 삭제 전에 백업을 다운로드하시는 것을 추천합니다."
    );
    if (doubleCheck) {
      onClearAll();
    }
  };

  return (
    <div className="bg-[#fff9f0] border border-[#ece5d8] rounded-3xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 text-xs">
      <div>
        <p className="font-serif text-sm font-bold text-[#352f28] flex items-center gap-1.5">
          <span>📓 비밀 다이어리 안전 백업 및 초기화</span>
        </p>
        <p className="text-[11px] text-[#a39788] mt-1 leading-relaxed">
          현재 기록된 {people.length}명의 소중한 지인 정보와 대화 히스토리를 로컬 파일로 백업해 보관하거나 초기화할 수 있습니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          id="export-backup-btn"
          onClick={handleExport}
          className="py-2 px-4 bg-white hover:bg-[#f3f0ea] text-[#352f28] font-bold rounded-full border border-[#ece5d8] shadow-sm transition-all flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5 text-[#ff6b6b]" /> 백업 파일 다운로드
        </button>

        <button
          id="import-backup-btn"
          onClick={triggerFileInput}
          className="py-2 px-4 bg-white hover:bg-[#f3f0ea] text-[#352f28] font-bold rounded-full border border-[#ece5d8] shadow-sm transition-all flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5 text-[#ff6b6b]" /> 백업 가져오기
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            className="hidden"
          />
        </button>

        <button
          id="clear-all-data-btn"
          onClick={confirmClearAll}
          className="py-2 px-4 bg-[#fdf2f2] hover:bg-[#fde8e8] text-[#ef4444] font-bold rounded-full border border-[#fecaca] transition-all flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" /> 데이터 전체 삭제
        </button>
      </div>
    </div>
  );
}
