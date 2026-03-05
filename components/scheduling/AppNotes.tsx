import { memo } from "react"

interface AppNotesProps {
    formData: any
    setFormData: (formData: any) => void
    errors: any
    setErrors: (errors: any) => void
    selectedDate?: Date
}
function AppNotes({ formData, setFormData, errors, setErrors, selectedDate }: AppNotesProps) {
    return (
        <div>
            <h1>AppNotes</h1>
        </div>
    )
}

export default memo(AppNotes)