import React, { useState } from "react";
import { SmallTextInput } from "../components/SmallTextInput";
import { LargeTextInput } from "../components/LargeTextInput";
import { TimeSelector } from "../components/TimeSelector";

export default function CustomForms() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    time: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 text-brick-100">
      <h1 className="text-2xl font-bold mb-6 text-brick-300">Custom Forms Page</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-brick-800 p-6 rounded-lg shadow-md border border-brick-700">
        <SmallTextInput
          label="sample small text input"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Enter task title"
          required
        />
        
        <LargeTextInput
          label="sample large text input"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe the task in detail..."
          required
        />
        
        <TimeSelector
          label="sample time selector"
          name="time"
          value={formData.time}
          onChange={handleChange}
          required
        />
        
        <button
          type="submit"
          className="w-full bg-grass-700 text-grass-100 font-medium py-2 px-4 rounded-md hover:bg-brick-600 focus:outline-none focus:ring-2 focus:ring-brick-500 focus:ring-offset-2 transition-colors"
        >
          Submit Form
        </button>
      </form>
    </div>
  );
}
