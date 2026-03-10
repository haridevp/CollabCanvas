import React, { useState } from 'react';
import { X, MessageSquare, Star, HelpCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { submitDeletionFeedback } from '../services/accountDeletionService';

/**
 * Interface defining the properties for the DeletionSurveyModal component
 * 
 * @interface DeletionSurveyModalProps
 * @property {boolean} isOpen - Controls the visibility of the modal
 * @property {() => void} onClose - Callback to close the modal
 * @property {() => void} onComplete - Callback when survey is completed or skipped
 * @property {string} userEmail - Email address of the user for contact purposes
 */
interface DeletionSurveyModalProps {
  /** Controls the visibility of the modal */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when survey is completed or skipped */
  onComplete: () => void;
  /** Email address of the user for contact purposes */
  userEmail: string;
}

/**
 * Interface defining the structure of survey data for submission
 * 
 * @interface SurveyData
 * @property {string} reason - Primary reason for account deletion
 * @property {string} feedback - Additional feedback from the user
 * @property {string} improvementSuggestions - Suggestions for platform improvement
 * @property {boolean} willingToParticipate - Willingness to participate in future research
 * @property {boolean} contactForFeedback - Permission to contact for follow-up
 */
interface SurveyData {
  reason: string;
  feedback: string;
  improvementSuggestions: string;
  willingToParticipate: boolean;
  contactForFeedback: boolean;
}

/**
 * Interface defining a deletion reason option
 * 
 * @interface DeletionReason
 * @property {string} id - Unique identifier for the reason
 * @property {string} label - Display label for the reason
 * @property {React.ComponentType} icon - Icon component for visual representation
 */
interface DeletionReason {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

/**
 * DeletionSurveyModal Component
 * 
 * @component
 * @description
 * A post-account-deletion feedback survey modal that collects user feedback
 * about why they're leaving the platform and suggestions for improvement.
 * 
 * @features
 * - **Reason Selection**: Multiple choice options for deletion reasons with icons
 * - **Open-Ended Feedback**: Text areas for detailed feedback and suggestions
 * - **Optional Participation**: Checkboxes for future research participation
 * - **Success Feedback**: Visual confirmation after successful submission
 * - **Validation**: Basic validation for required fields
 * - **Accessibility**: Proper form labeling and keyboard navigation
 * - **Graceful Handling**: Option to skip feedback entirely
 * 
 * @purpose
 * This component helps gather valuable user insights when accounts are deleted,
 * enabling data-driven improvements to the platform and reducing churn.
 * 
 * @example
 * ```tsx
 * // Usage in account deletion flow
 * <DeletionSurveyModal
 *   isOpen={showSurvey}
 *   onClose={() => setShowSurvey(false)}
 *   onComplete={handleDeletionComplete}
 *   userEmail="user@example.com"
 * />
 * 
 * // With state management
 * const [isSurveyOpen, setIsSurveyOpen] = useState(false);
 * 
 * <DeletionSurveyModal
 *   isOpen={isSurveyOpen}
 *   onClose={() => setIsSurveyOpen(false)}
 *   onComplete={() => {
 *     setIsSurveyOpen(false);
 *     deleteAccount();
 *   }}
 *   userEmail={currentUser.email}
 * />
 * ```
 * 
 * @param {DeletionSurveyModalProps} props - Component properties
 * @param {boolean} props.isOpen - Modal visibility state
 * @param {() => void} props.onClose - Close handler
 * @param {() => void} props.onComplete - Completion handler
 * @param {string} props.userEmail - User's email address
 * 
 * @returns {JSX.Element | null} Survey modal or null if not open
 */
const DeletionSurveyModal: React.FC<DeletionSurveyModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  userEmail
}) => {
  /**
   * State for the selected deletion reason
   * 
   * @state {string} reason
   */
  const [reason, setReason] = useState<string>('');
  
  /**
   * State for additional feedback text
   * 
   * @state {string} feedback
   */
  const [feedback, setFeedback] = useState<string>('');
  
  /**
   * State for improvement suggestions
   * 
   * @state {string} improvementSuggestions
   */
  const [improvementSuggestions, setImprovementSuggestions] = useState<string>('');
  
  /**
   * State for willingness to participate in future research
   * 
   * @state {boolean} willingToParticipate
   */
  const [willingToParticipate, setWillingToParticipate] = useState<boolean>(false);
  
  /**
   * State for permission to contact for follow-up feedback
   * 
   * @state {boolean} contactForFeedback
   */
  const [contactForFeedback, setContactForFeedback] = useState<boolean>(false);
  
  /**
   * State indicating whether survey submission is in progress
   * 
   * @state {boolean} isSubmitting
   */
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  /**
   * State indicating whether survey has been successfully submitted
   * 
   * @state {boolean} submitted
   */
  const [submitted, setSubmitted] = useState<boolean>(false);

  /**
   * Array of predefined deletion reasons with icons
   * 
   * @constant {DeletionReason[]} deletionReasons
   */
  const deletionReasons: DeletionReason[] = [
    { id: 'not-useful', label: "Didn't find it useful", icon: ThumbsDown },
    { id: 'too-complex', label: 'Too complicated to use', icon: HelpCircle },
    { id: 'privacy-concerns', label: 'Privacy concerns', icon: Star },
    { id: 'found-alternative', label: 'Found a better alternative', icon: ThumbsUp },
    { id: 'temporary', label: 'Temporary account', icon: MessageSquare },
    { id: 'other', label: 'Other reason', icon: X },
  ];

  /**
   * Handles survey form submission
   * Validates input, submits data via API, and handles response
   * 
   * @async
   * @function handleSubmit
   * @returns {Promise<void>}
   * 
   * @throws Will display alert messages for validation errors or submission failures
   */
  const handleSubmit = async (): Promise<void> => {
    // Validate that a reason has been selected
    if (!reason) {
      alert('Please select a reason for leaving');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare survey data for submission
      const survey: SurveyData = {
        reason,
        feedback,
        improvementSuggestions,
        willingToParticipate,
        contactForFeedback
      };

      // Submit survey data to backend
      const result = await submitDeletionFeedback(survey);

      if (result.success) {
        // Show success state and proceed with completion
        setSubmitted(true);
        setTimeout(() => {
          onComplete();
          onClose();
        }, 2000); // Show success message for 2 seconds
      } else {
        // Show error message from API response
        alert(result.message);
      }
    } catch (error) {
      console.error('Survey submission error:', error);
      alert('Failed to submit survey. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render anything if modal is not open
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="We're Sorry to See You Go"
    >
      {submitted ? (
        /* Success state - shown after successful submission */
        <div className="text-center p-4" role="alert" aria-live="polite">
          <div 
            className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
            aria-hidden="true"
          >
            <ThumbsUp className="text-green-600 dark:text-green-400" size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Thank You!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Your feedback has been submitted. We appreciate you taking the time to help us improve.
          </p>
          <Button 
            onClick={onClose} 
            className="w-full"
            aria-label="Close thank you message"
          >
            Close
          </Button>
        </div>
      ) : (
        /* Survey form - shown for active survey completion */
        <div className="space-y-6">
          {/* Informational header */}
          <div 
            className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800"
            role="note"
            aria-label="Account deletion processed"
          >
            <p className="text-blue-800 dark:text-blue-300">
              Your account deletion has been processed. We'd appreciate a moment of your time 
              to tell us why you're leaving and how we can improve.
            </p>
          </div>

          {/* Reason for leaving selection */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              What was the main reason for deleting your account?
              <span className="text-red-500 ml-1" aria-hidden="true">*</span>
              <span className="sr-only">Required</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {deletionReasons.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setReason(item.id)}
                    className={`p-4 border rounded-xl text-left transition-all ${
                      reason === item.id
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-700'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                    type="button"
                    role="radio"
                    aria-checked={reason === item.id}
                    aria-label={item.label}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setReason(item.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon 
                        size={18} 
                        className={`${
                          reason === item.id 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-slate-600 dark:text-slate-400'
                        }`} 
                      />
                      <span className={`font-medium ${
                        reason === item.id 
                          ? 'text-blue-700 dark:text-blue-300' 
                          : 'text-slate-800 dark:text-slate-300'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional feedback text area */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Any additional feedback you'd like to share?
            </h3>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
             
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              rows={3}
              aria-label="Additional feedback"
            />
          </div>

          {/* Improvement suggestions text area */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Suggestions for improvement
            </h3>
            <textarea
              value={improvementSuggestions}
              onChange={(e) => setImprovementSuggestions(e.target.value)}
             
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              rows={2}
              aria-label="Suggestions for improvement"
            />
          </div>

          {/* Optional participation checkboxes */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="willing-to-participate"
                checked={willingToParticipate}
                onChange={(e) => setWillingToParticipate(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                aria-label="Willing to participate in future user research"
              />
              <label 
                htmlFor="willing-to-participate" 
                className="text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                I'd be willing to participate in future user research interviews
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="contact-for-feedback"
                checked={contactForFeedback}
                onChange={(e) => setContactForFeedback(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                aria-label="Permission to contact for follow-up feedback"
              />
              <label 
                htmlFor="contact-for-feedback" 
                className="text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                You may contact me at <span className="font-medium">{userEmail}</span> for follow-up feedback
              </label>
            </div>
          </div>

          {/* Form action buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              onClick={handleSubmit}
              isLoading={isSubmitting}
              className="flex-1"
              aria-label="Submit feedback"
              disabled={!reason}
            >
              Submit Feedback
            </Button>
            <Button
              onClick={onComplete}
              variant="outline"
              className="flex-1"
              aria-label="Skip feedback and close"
            >
              Skip Feedback
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default DeletionSurveyModal;