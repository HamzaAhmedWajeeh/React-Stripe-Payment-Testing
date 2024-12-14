import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';

import ApiService from "../api";
import '../css/checkoutform.css';

const CheckoutForm = () => {
  const [error, setError] = useState(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState('standard'); // Default to 'basic'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const navigate = useNavigate();

  const stripe = useStripe();
  const elements = useElements();

  // Handle real-time validation errors from the CardElement.
  const handleChange = (event) => {
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }

  }

  // Handle form submission.
  // Inside the handleSubmit function...
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const card = elements.getElement(CardElement);

    try {
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: card
      });

      if (error) {
        setError(error.message);
      } else {
      ApiService.getSubscriptionClientSecret({
          payment_method_id: paymentMethod.id, // Include payment_method_id in the request
          package_name: subscriptionPlan
        })
        .then(response => {
          const clientSecret = response.data.clientSecret
          const payment_method_id = response.data.payment_method_id
          return stripe.confirmCardPayment(clientSecret, {
            payment_method: payment_method_id,
          })
        })
          .then(response => {
            if (!error) {
              navigate('/success');
            }
          })
          .catch(error => {
            const message = error.response.data.message;
            const colonIndex = message.indexOf(':');
            const reason = colonIndex !== -1 ? message.substring(colonIndex + 2) : null;
            navigate('/canceled', { state: reason || 'Unknown error occurred' });
          });
      }
    } finally {
      setIsSubmitting(false);
    }
  };








  return (
    <form onSubmit={handleSubmit} className="stripe-form">
      <div className="form-group">
        <label htmlFor="subscription-plan">Choose a Subscription Plan:</label>
        <select
          id="subscription-plan"
          name="subscriptionPlan"
          value={subscriptionPlan}
          onChange={(event) => setSubscriptionPlan(event.target.value)}
        >
          <option value="standard">Standard</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="card-element">Enter your Credit or Debit Card:</label>
        <CardElement id="card-element" onChange={handleChange} />
        <div className="card-errors" role="alert">{error}</div>
      </div>
      <button type="submit" className="submit-btn" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Payment'}
      </button>
      <button type="submit" className="submit-btn" disabled={isSubmitting}>
        {isSubmitting ? 'Cancelling...' : 'Cancel Payment'}
      </button>
    </form>
  );


};

export default CheckoutForm;
