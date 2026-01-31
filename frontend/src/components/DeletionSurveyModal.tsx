import React, { useState } from 'react';
import { X, MessageSquare, Star, HelpCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { submitDeletionFeedback } from '../services/accountDeletionService';

interface DeletionSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  userEmail: string;
}

/**
 * DeletionSurveyModal component
 * Post-deletion feedback survey modal
 */
const DeletionSurveyModal: React.FC<DeletionSurveyModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  userEmail
}) => {
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [improvementSuggestions, setImprovementSuggestions] = useState('');
  const [willingToParticipate, setWillingToParticipate] = useState(false);
  const [contactForFeedback, setContactForFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const deletionReasons = [
    { id: 'not-useful', label: "Didn't find it useful", icon: ThumbsDown },
    { id: 'too-complex', label: 'Too complicated to use', icon: HelpCircle },
    { id: 'privacy-concerns', label: 'Privacy concerns', icon: Star },
    { id: 'found-alternative', label: 'Found a better alternative', icon: ThumbsUp },
    { id: 'temporary', label: 'Temporary account', icon: MessageSquare },
    { id: 'other', label: 'Other reason', icon: X },
  ];

  /**
   * Handles survey submission
   */
  const handleSubmit = async () => {
    if (!reason) {
      alert('Please select a reason for leaving');
      return;
    }

    setIsSubmitting(true);

    try {
      const survey = {
        reason,
        feedback,
        improvementSuggestions,
        willingToParticipate,
        contactForFeedback
      };

      const result = await submitDeletionFeedback(survey);

      if (result.success) {
        setSubmitted(true);
        setTimeout(() => {
          onComplete();
          onClose();
        }, 2000);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Survey submission error:', error);
      alert('Failed to submit survey. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="We're Sorry to See You Go"
    >
      {submitted ? (
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ThumbsUp className="text-green-600" size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Thank You!</h2>
          <p className="text-slate-600 mb-6">
            Your feedback has been submitted. We appreciate you taking the time to help us improve.
          </p>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800">
              Your account deletion has been processed. We'd appreciate a moment of your time to tell us why you're leaving and how we can improve.
            </p>
          </div>

          {/* Reason for leaving */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">
              What was the main reason for deleting your account?
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
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={18} className="text-slate-600" />
                      <span className="font-medium text-slate-800">{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">
              Any additional feedback you'd like to share?
            </h3>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What could we have done better? What did you like or dislike?"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] resize-none"
              rows={3}
            />
          </div>

          {/* Improvement suggestions */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">
              Suggestions for improvement
            </h3>
            <textarea
              value={improvementSuggestions}
              onChange={(e) => setImprovementSuggestions(e.target.value)}
              placeholder="What features would make you consider using our platform again?"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] resize-none"
              rows={2}
            />
          </div>

          {/* Optional participation */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="willing-to-participate"
                checked={willingToParticipate}
                onChange={(e) => setWillingToParticipate(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="willing-to-participate" className="text-slate-700">
                I'd be willing to participate in future user research interviews
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="contact-for-feedback"
                checked={contactForFeedback}
                onChange={(e) => setContactForFeedback(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="contact-for-feedback" className="text-slate-700">
                You may contact me at {userEmail} for follow-up feedback
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              onClick={handleSubmit}
              isLoading={isSubmitting}
              className="flex-1"
            >
              Submit Feedback
            </Button>
            <Button
              onClick={onComplete}
              variant="outline"
              className="flex-1"
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