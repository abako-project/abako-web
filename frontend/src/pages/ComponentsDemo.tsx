import React, { useState } from 'react';
import {
  Badge,
  TabsLine,
  ProgressSegmented,
  Avatar,
  AvatarLabel,
  FeedItem,
  StepperNumeric,
  TextArea,
  Combobox,
  CardWidget,
} from '@components/ui';

export const ComponentsDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRole, setSelectedRole] = useState('');

  return (
    <div className="min-h-screen bg-[var(--base-surface-1,#141414)] p-8">
      <div className="mx-auto max-w-7xl space-y-12">
        <div>
          <h1 className="mb-2 text-4xl font-bold text-[var(--text-dark-primary,#f5f5f5)]">
            Abako Design System
          </h1>
          <p className="text-lg text-[var(--text-dark-secondary,rgba(255,255,255,0.7))]">
            Figma Design Tokens + Shared UI Primitive Components
          </p>
        </div>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[var(--text-dark-primary,#f5f5f5)]">Badges</h2>
          <div className="flex flex-wrap gap-3">
            <Badge variant="success">Active</Badge>
            <Badge variant="neutral">Pending</Badge>
            <Badge variant="success">Completed</Badge>
            <Badge variant="neutral">Draft</Badge>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[var(--text-dark-primary,#f5f5f5)]">Tabs</h2>
          <TabsLine
            tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'scope', label: 'Scope' },
              { id: 'milestones', label: 'Milestones' },
              { id: 'team', label: 'Team' },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[var(--text-dark-primary,#f5f5f5)]">
            Progress Segmented
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <ProgressSegmented value={0} />
            <ProgressSegmented value={30} />
            <ProgressSegmented value={70} />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[var(--text-dark-primary,#f5f5f5)]">Avatars</h2>
          <div className="flex flex-wrap items-center gap-6">
            <Avatar size="sm" />
            <Avatar size="md" />
            <Avatar size="lg" />
            <Avatar size="md" showOnline />
            <Avatar
              size="lg"
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
              showOnline
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[var(--text-dark-primary,#f5f5f5)]">
            Avatar with Label
          </h2>
          <div className="space-y-4">
            <AvatarLabel name="John Doe" subtitle="Frontend Developer" />
            <AvatarLabel
              name="Jane Smith"
              subtitle="Product Designer"
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jane"
              showOnline
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[var(--text-dark-primary,#f5f5f5)]">
            Activity Feed
          </h2>
          <div className="space-y-4 rounded-[var(--radi-6,12px)] bg-[var(--base-surface-2,#231f1f)] p-6">
            <FeedItem
              actorName="Alice Johnson"
              action="accepted the project scope"
              timestamp="2 hours ago"
            />
            <FeedItem actorName="Bob Williams" action="submitted milestone 1" timestamp="5 hours ago" />
            <FeedItem
              actorName="Charlie Brown"
              action="updated team requirements"
              timestamp="1 day ago"
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[var(--text-dark-primary,#f5f5f5)]">
            Numeric Stepper
          </h2>
          <div className="flex justify-center">
            <StepperNumeric
              steps={[
                { label: 'Project Details' },
                { label: 'Scope Definition' },
                { label: 'Team Setup' },
                { label: 'Review' },
              ]}
              currentStep={2}
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[var(--text-dark-primary,#f5f5f5)]">Form Inputs</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <TextArea
              label="Project Description"
              placeholder="Describe your project..."
              caption="Be as detailed as possible"
              rows={4}
            />
            <Combobox
              label="Select Role"
              placeholder="Choose a role..."
              options={[
                { value: 'developer', label: 'Developer' },
                { value: 'designer', label: 'Designer' },
                { value: 'manager', label: 'Project Manager' },
              ]}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold text-[var(--text-dark-primary,#f5f5f5)]">
            Card Widget
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <CardWidget
              title="E-commerce Platform"
              badges={[
                { label: 'Active', variant: 'success' },
                { label: 'Full-Stack', variant: 'neutral' },
              ]}
              progress={75}
              onClick={() => alert('Card clicked')}
            />
            <CardWidget
              title="Mobile App Redesign"
              badges={[{ label: 'Design', variant: 'neutral' }]}
              progress={30}
            />
            <CardWidget
              title="Blockchain Integration"
              badges={[
                { label: 'Completed', variant: 'success' },
                { label: 'Smart Contracts', variant: 'neutral' },
              ]}
              progress={100}
            />
          </div>
        </section>
      </div>
    </div>
  );
};
