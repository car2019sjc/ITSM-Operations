import React from 'react';
import { format } from 'date-fns';
import { Incident } from '../types/incident';

interface IncidentTableProps {
  incidents: Incident[];
}

export function IncidentTable({ incidents }: IncidentTableProps) {
  return (
    <div className="mt-8 flex flex-col">
      <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Number
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Opened
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Description
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Caller
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Priority
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    State
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {incidents.map((incident) => (
                  <tr key={incident.Number}>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{incident.Number}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {(() => {
                        try {
                          return format(new Date(incident.Opened), 'dd/MM/yyyy HH:mm');
                        } catch (error) {
                          return 'Invalid date';
                        }
                      })()}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 max-w-md truncate">
                      {incident.ShortDescription}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{incident.Caller}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{incident.Priority}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{incident.State}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{incident.Category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}