import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, Tag } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";

interface PromoCodeInputProps {
  onPromoCodeValidated: (code: string | null, discountInfo?: any) => void;
  disabled?: boolean;
}

export const PromoCodeInput = ({
  onPromoCodeValidated,
  disabled = false,
}: PromoCodeInputProps) => {
  const [promoCode, setPromoCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: string;
    discount_info?: any;
  } | null>(null);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);

  const { validatePromoCode } = useSubscription();

  const handleValidateCode = async () => {
    if (!promoCode.trim()) return;

    setIsValidating(true);
    try {
      const result = await validatePromoCode(promoCode);
      setValidationResult(result);

      if (result.valid) {
        setAppliedCode(promoCode.toUpperCase());
        onPromoCodeValidated(promoCode.toUpperCase(), result.discount_info);
      } else {
        setAppliedCode(null);
        onPromoCodeValidated(null);
      }
    } catch (error) {
      setValidationResult({
        valid: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to validate promo code",
      });
      setAppliedCode(null);
      onPromoCodeValidated(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveCode = () => {
    setPromoCode("");
    setValidationResult(null);
    setAppliedCode(null);
    onPromoCodeValidated(null);
  };

  const formatDiscount = (discountInfo: any) => {
    if (!discountInfo) return "";

    if (discountInfo.percent_off) {
      return `${discountInfo.percent_off}% off`;
    } else if (discountInfo.amount_off) {
      const amount = (discountInfo.amount_off / 100).toFixed(2);
      const currency = discountInfo.currency?.toUpperCase() || "USD";
      return `$${amount} ${currency} off`;
    }
    return "Discount applied";
  };

  const getDurationText = (discountInfo: any) => {
    if (!discountInfo) return "";

    switch (discountInfo.duration) {
      case "once":
        return "for first payment";
      case "repeating":
        return discountInfo.duration_in_months
          ? `for ${discountInfo.duration_in_months} month${discountInfo.duration_in_months > 1 ? "s" : ""}`
          : "for limited time";
      case "forever":
        return "forever";
      default:
        return "";
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="promo-code" className="text-sm font-medium">
              Promo Code (Optional)
            </Label>
          </div>

          {appliedCode ? (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    >
                      {appliedCode}
                    </Badge>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      {formatDiscount(validationResult?.discount_info)}
                    </span>
                  </div>
                  {validationResult?.discount_info && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {getDurationText(validationResult.discount_info)}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveCode}
                disabled={disabled}
                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  id="promo-code"
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={disabled || isValidating}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && promoCode.trim()) {
                      handleValidateCode();
                    }
                  }}
                />
                <Button
                  onClick={handleValidateCode}
                  disabled={!promoCode.trim() || disabled || isValidating}
                  variant="outline"
                  size="sm"
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>

              {validationResult && !validationResult.valid && (
                <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                  <X className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {validationResult.error || "Invalid promo code"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
