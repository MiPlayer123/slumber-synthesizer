
export const LoadingSpinner = ({ text }: { text?: string }) => (
  <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      {text && <p className="text-muted-foreground">{text}</p>}
    </div>
  </div>
);
