import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  Target,
} from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import {
  type PursuitAssessment,
  type PursuitRecommendation,
  PursuitService,
} from "@/client/pursuit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export const Route = createFileRoute("/_layout/pursuit")({
  component: PursuitPage,
  head: () => ({
    meta: [
      {
        title: "Pursuit Qualifier - Pursuit Qualification Assistant",
      },
    ],
  }),
})

const scoreSchema = z.string().min(1, "Required")

const formSchema = z.object({
  opportunity_name: z.string().min(1, "Opportunity name is required"),
  relationship_strength: scoreSchema,
  fit: scoreSchema,
  timing: scoreSchema,
  budget_realism: scoreSchema,
  competitive_position: scoreSchema,
  delivery_risk: scoreSchema,
  differentiators: scoreSchema,
  notes: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

const DIMENSIONS = [
  {
    name: "relationship_strength" as const,
    label: "Relationship Strength",
    description: "How strong is your relationship with the client / prospect?",
    options: [
      { value: "1", label: "1 – No relationship" },
      { value: "2", label: "2 – Minimal contact" },
      { value: "3", label: "3 – Established contact" },
      { value: "4", label: "4 – Strong relationship" },
      { value: "5", label: "5 – Trusted advisor / advocate" },
    ],
  },
  {
    name: "fit" as const,
    label: "Opportunity Fit",
    description: "How well does this opportunity align with your capabilities?",
    options: [
      { value: "1", label: "1 – Poor fit" },
      { value: "2", label: "2 – Weak fit" },
      { value: "3", label: "3 – Moderate fit" },
      { value: "4", label: "4 – Good fit" },
      { value: "5", label: "5 – Perfect fit / sweet spot" },
    ],
  },
  {
    name: "timing" as const,
    label: "Timing",
    description: "Is the timing right to influence this opportunity?",
    options: [
      { value: "1", label: "1 – Very poor timing" },
      { value: "2", label: "2 – Challenging timing" },
      { value: "3", label: "3 – Adequate timing" },
      { value: "4", label: "4 – Good timing" },
      { value: "5", label: "5 – Ideal timing" },
    ],
  },
  {
    name: "budget_realism" as const,
    label: "Budget Realism",
    description: "Is the available budget realistic for the full scope?",
    options: [
      { value: "1", label: "1 – Severely underfunded" },
      { value: "2", label: "2 – Budget is tight" },
      { value: "3", label: "3 – Workable but constrained" },
      { value: "4", label: "4 – Reasonable and aligned" },
      { value: "5", label: "5 – Well-funded" },
    ],
  },
  {
    name: "competitive_position" as const,
    label: "Competitive Position",
    description: "How does your standing compare to the competition?",
    options: [
      { value: "1", label: "1 – Major disadvantage" },
      { value: "2", label: "2 – Weaker position" },
      { value: "3", label: "3 – Neutral / even" },
      { value: "4", label: "4 – Strong position" },
      { value: "5", label: "5 – Clear frontrunner" },
    ],
  },
  {
    name: "delivery_risk" as const,
    label: "Delivery Risk",
    description:
      "How manageable is the execution and delivery risk? (higher = lower risk)",
    options: [
      { value: "1", label: "1 – Very high risk" },
      { value: "2", label: "2 – High risk" },
      { value: "3", label: "3 – Moderate risk" },
      { value: "4", label: "4 – Low-moderate risk" },
      { value: "5", label: "5 – Low risk" },
    ],
  },
  {
    name: "differentiators" as const,
    label: "Differentiators",
    description:
      "How strong and relevant are your differentiators for this opportunity?",
    options: [
      { value: "1", label: "1 – No differentiators" },
      { value: "2", label: "2 – Weak differentiators" },
      { value: "3", label: "3 – Some differentiators" },
      { value: "4", label: "4 – Strong differentiators" },
      { value: "5", label: "5 – Unique and compelling" },
    ],
  },
]

function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
  const pct = (score / max) * 100
  const color =
    score >= 4 ? "bg-green-500" : score >= 3 ? "bg-yellow-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-medium tabular-nums w-8 text-right">
        {score}/{max}
      </span>
    </div>
  )
}

function RecommendationBadge({ recommendation }: { recommendation: string }) {
  if (recommendation === "Pursue") {
    return (
      <Badge className="text-base px-4 py-1 bg-green-600 hover:bg-green-600 text-white">
        <CheckCircle2 className="mr-1.5 size-4" />
        Pursue
      </Badge>
    )
  }
  if (recommendation === "Shape") {
    return (
      <Badge className="text-base px-4 py-1 bg-yellow-500 hover:bg-yellow-500 text-white">
        <Target className="mr-1.5 size-4" />
        Shape
      </Badge>
    )
  }
  return (
    <Badge className="text-base px-4 py-1 bg-red-600 hover:bg-red-600 text-white">
      <AlertTriangle className="mr-1.5 size-4" />
      Walk Away
    </Badge>
  )
}

function ResultPanel({
  result,
  onReset,
}: {
  result: PursuitRecommendation
  onReset: () => void
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-xl">
                {result.opportunity_name}
              </CardTitle>
              <CardDescription className="mt-1">
                Overall score: {result.overall_score.toFixed(1)} / 5.0
              </CardDescription>
            </div>
            <RecommendationBadge recommendation={result.recommendation} />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm leading-relaxed">{result.summary}</p>
        </CardContent>
      </Card>

      {/* Dimension breakdown */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Dimension Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4">
            {result.dimensions.map((dim) => (
              <div key={dim.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{dim.label}</span>
                </div>
                <ScoreBar score={dim.score} max={dim.max_score} />
                <p className="text-xs text-muted-foreground mt-1">
                  {dim.rationale}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommended actions */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ul className="flex flex-col gap-3">
            {result.actions.map((action) => (
              <li key={action} className="flex items-start gap-2 text-sm">
                <ChevronRight className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Button variant="outline" onClick={onReset} className="self-start">
        <RotateCcw className="mr-2 size-4" />
        Assess Another Opportunity
      </Button>
    </div>
  )
}

function PursuitPage() {
  const [result, setResult] = useState<PursuitRecommendation | null>(null)
  const { showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      opportunity_name: "",
      notes: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (data: PursuitAssessment) =>
      PursuitService.assessPursuit({ requestBody: data }),
    onSuccess: (data) => {
      setResult(data)
    },
    onError: handleError.bind(showErrorToast),
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate({
      opportunity_name: data.opportunity_name,
      relationship_strength: Number(data.relationship_strength),
      fit: Number(data.fit),
      timing: Number(data.timing),
      budget_realism: Number(data.budget_realism),
      competitive_position: Number(data.competitive_position),
      delivery_risk: Number(data.delivery_risk),
      differentiators: Number(data.differentiators),
      notes: data.notes || undefined,
    })
  }

  if (result) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Pursuit Qualifier
          </h1>
          <p className="text-muted-foreground">
            Assessment result for your opportunity
          </p>
        </div>
        <ResultPanel result={result} onReset={() => setResult(null)} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pursuit Qualifier</h1>
        <p className="text-muted-foreground">
          Evaluate an opportunity across seven key dimensions to get a clear
          pursue, shape, or walk-away recommendation.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          {/* Opportunity name */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Opportunity Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-4">
              <FormField
                control={form.control}
                name="opportunity_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Opportunity Name{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. ACME Corp – Digital Transformation Program"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Any additional context or observations"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Qualification dimensions */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Qualification Dimensions</CardTitle>
              <CardDescription>
                Score each dimension from 1 (lowest) to 5 (highest).
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {DIMENSIONS.map((dim) => (
                  <FormField
                    key={dim.name}
                    control={form.control}
                    name={dim.name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {dim.label}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <p className="text-xs text-muted-foreground -mt-1 mb-1">
                          {dim.description}
                        </p>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a score…" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {dim.options.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <LoadingButton
              type="submit"
              loading={mutation.isPending}
              className="min-w-40"
            >
              Generate Recommendation
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  )
}
