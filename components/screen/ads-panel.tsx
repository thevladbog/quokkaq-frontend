import { Card } from "@/components/ui/card";

export function AdsPanel() {
    return (
        <Card className="h-full w-full flex items-center justify-center bg-muted/50 border-none shadow-none rounded-none">
            <div className="text-center p-8">
                <h2 className="text-3xl font-bold text-muted-foreground mb-4">Advertisement Space</h2>
                <p className="text-xl text-muted-foreground">Place your content here</p>
                {/* Placeholder for image/video carousel */}
                <div className="mt-8 text-9xl opacity-10">📺</div>
            </div>
        </Card>
    );
}
