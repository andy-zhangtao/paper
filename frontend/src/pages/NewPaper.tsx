import { PaperCreationWizard } from '@/features/editor/PaperCreationWizard'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface NewPaperPageProps {
  onBack?: () => void
}

export const NewPaperPage = ({ onBack }: NewPaperPageProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部返回按钮 */}
      {onBack && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Button>
        </div>
      )}
      <PaperCreationWizard />
    </div>
  )
}
