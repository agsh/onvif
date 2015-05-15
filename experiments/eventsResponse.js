/**
 *
 * @type {{getEventPropertiesResponse: {topicNamespaceLocation: string[], fixedTopicSet: boolean, topicSet: {device: *[], videoSource: {motionAlarm: {$: {wstop:topic: boolean}, messageDescription: {$: {IsProperty: boolean}, source: {simpleItemDescription: {$: {Name: string, Type: string}}}, data: {simpleItemDescription: {$: {Name: string, Type: string}}}}}}, videoAnalytics: {motionDetection: {$: {wstop:topic: boolean}, messageDescription: {$: {IsProperty: boolean}, source: {simpleItemDescription: {$: {Name: string, Type: string}}}, data: {simpleItemDescription: {$: {Name: string, Type: string}}}}}}}, topicExpressionDialect: string[], messageContentFilterDialect: string, messageContentSchemaLocation: string}}}
 */
var r = {
	getEventPropertiesResponse: {
		topicNamespaceLocation: [
			'http://www.onvif.org/onvif/ver10/topics/topicns.xml',
			'http://www.axis.com/2009/event/topics'
		],
		fixedTopicSet: true,
		topicSet: {
			device: [
				{
					trigger: {
						digitalInput: {
							'$': {'wstop:topic': true},
							messageDescription: {
								'$': {IsProperty: true},
								source: {
									simpleItemDescription: {
										'$': {
											Name: 'InputToken',
											Type: 'tt:ReferenceToken'
										}
									}
								},
								data: {
									simpleItemDescription: {
										'$': {
											Name: 'LogicalState',
											Type: 'xsd:boolean'
										}
									}
								}
							}
						}
					}
				},
				{
					IO: {
						port: {
							'$': {'wstop:topic': true},
							messageDescription: {
								'$': {IsProperty: true},
								source: {
									simpleItemDescription: {
										'$': {
											Name: 'port',
											Type: 'xsd:int'
										}
									}
								},
								data: {
									simpleItemDescription: {
										'$': {
											Name: 'state',
											Type: 'xsd:boolean'
										}
									}
								}
							}
						}
					}
				}
			],
			videoSource: {
				motionAlarm: {
					'$': {'wstop:topic': true},
					messageDescription: {
						'$': {IsProperty: true},
						source: {
							simpleItemDescription: {
								'$': {
									Name: 'Source',
									Type: 'tt:ReferenceToken'
								}
							}
						},
						data: {
							simpleItemDescription: {
								'$': {
									Name: 'State',
									Type: 'xsd:boolean'
								}
							}
						}
					}
				}
			},
			videoAnalytics: {
				motionDetection: {
					'$': {'wstop:topic': true},
					messageDescription: {
						'$': {IsProperty: true},
						source: {
							simpleItemDescription: {
								'$': {
									Name: 'window',
									Type: 'xsd:int'
								}
							}
						},
						data: {
							simpleItemDescription: {
								'$': {
									Name: 'motion',
									Type: 'xsd:boolean'
								}
							}
						}
					}
				}
			}
		},
		topicExpressionDialect: [
			'http://www.onvif.org/ver10/tev/topicExpression/ConcreteSet',
			'http://docs.oasis-open.org/wsn/t-1/TopicExpression/Concrete'
		],
		messageContentFilterDialect: 'http://www.onvif.org/ver10/tev/messageContentFilter/ItemFilter',
		messageContentSchemaLocation: 'http://www.onvif.org/onvif/ver10/schema/onvif.xsd'
	}
};
