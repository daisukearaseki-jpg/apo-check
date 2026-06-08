import { Toaster } from "@/components/ui/sonner"
import { AppointmentWizard } from "@/components/appointment/appointment-wizard"

export default function Page() {
  return (
    <>
      <AppointmentWizard />
      <Toaster position="top-center" richColors />
    </>
  )
}
